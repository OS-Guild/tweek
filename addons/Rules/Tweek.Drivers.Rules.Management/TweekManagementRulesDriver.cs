﻿using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Reactive.Concurrency;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Threading.Tasks;
using App.Metrics;
using App.Metrics.Core.Abstractions;
using App.Metrics.Core.Options;
using Engine.Drivers.Rules;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using static LanguageExt.Prelude;
using Unit = App.Metrics.Unit;

namespace Tweek.Drivers.Rules.Management
{
  public class TweekManagementRulesDriver : IRulesDriver, IDisposable
  {
    public event Action<IDictionary<string, RuleDefinition>> OnRulesChange;
    private const string RULESET_PATH = "/ruleset/latest";
    private const string RULESET_LATEST_VERSION_PATH = "/ruleset/latest/version";
    private IDisposable _subscription;
    private readonly IConnectableObservable<Dictionary<string, RuleDefinition>> _pipeline;
    public string CurrentLabel { get; private set; }
    public DateTime LastCheckTime = DateTime.UtcNow;

    private static TimerOptions GetTimerOptions(string name)
    {
      return new TimerOptions()
      {
        Name = name,
        Context = "TweekManagementRulesDriver",
        DurationUnit = TimeUnit.Milliseconds,
        MeasurementUnit = Unit.None,
        RateUnit = TimeUnit.Minutes
      };
    }

    private static Func<T, Task<U>> MeasureAsync<T, U>(IMeasureMetrics metrics, string name, Func<T, Task<U>> mapFunc)
    {
      return Optional(metrics)
          .Match(someMetrics =>
              async t =>
              {
                using (someMetrics.Timer.Time(GetTimerOptions(name)))
                {
                  return await mapFunc(t);
                }
              }, () => mapFunc);
    }

    private static async Task Delay(TimeSpan delay, IScheduler scheduler)
    {
      await Observable.Return(System.Reactive.Unit.Default).Delay(delay, scheduler);
    }

    private TweekManagementRulesDriver(HttpGet getter, TweekManagementRulesDriverSettings settings, ILogger logger = null, IMeasureMetrics metrics = null, IScheduler scheduler = null)
    {
      logger = logger ?? NullLogger.Instance;
      scheduler = scheduler ?? DefaultScheduler.Instance;
      var measuredGetter = MeasureAsync<string, HttpResponseMessage>(metrics, "download_latest_header", s => getter(s));
      var measuredDownloader = MeasureAsync(metrics, "download_ruleset", (HttpResponseMessage message) => message.ExtractRules());

      _pipeline = Observable.Create<Dictionary<string, RuleDefinition>>(async (sub, ct) =>
      {
        try
        {
          while (!ct.IsCancellationRequested)
          {
            var versionResponse = await measuredGetter(RULESET_LATEST_VERSION_PATH);
            var latestVersion = await versionResponse.Content.ReadAsStringAsync();
            LastCheckTime = scheduler.Now.UtcDateTime;
            if (latestVersion != CurrentLabel)
            {
              var rulesetResponse = await getter(RULESET_PATH);
              var newVersion = rulesetResponse.GetRulesVersion();
              var ruleset = await measuredDownloader(rulesetResponse);
              sub.OnNext(ruleset);
              CurrentLabel = newVersion;
            }
            await Delay(settings.SampleInterval, scheduler);
          }
        }
        catch (Exception ex)
        {
          sub.OnError(ex);
        }
      })
          .SubscribeOn(scheduler)
          .Catch((Exception exception) =>
          {
            logger.LogWarning(exception, "Failed to update rules");
            return Observable.Empty<Dictionary<string, RuleDefinition>>()
                      .Delay(settings.FailureDelay);
          })
          .Repeat()
          .Replay(1);
    }

    private void Start() => _subscription = new CompositeDisposable(_pipeline.Subscribe(rules => OnRulesChange?.Invoke(rules)), _pipeline.Connect());

    public static TweekManagementRulesDriver StartNew(HttpGet getter, TweekManagementRulesDriverSettings settings, ILogger logger = null,
        IMeasureMetrics metrics = null, IScheduler scheduler = null)
    {
      var driver = new TweekManagementRulesDriver(getter, settings, logger,
          metrics, scheduler);
      driver.Start();
      return driver;
    }

    public async Task<Dictionary<string, RuleDefinition>> GetAllRules() => await _pipeline.FirstAsync();

    public void Dispose()
    {
      _subscription?.Dispose();
    }
  }
}

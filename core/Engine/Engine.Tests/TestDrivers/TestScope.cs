using System;
using System.Threading.Tasks;
using Engine.Drivers.Context;
using Engine.Drivers.Rules;
using Tweek.JPad;
using System.Collections.Generic;
using System.Security.Cryptography;
using Microsoft.FSharp.Core;
using Tweek.JPad.Utils;

namespace Engine.Tests.TestDrivers
{
    public class TestScope
    {
        private readonly Func<Task> _dispose;
        private readonly IRulesRepository mRulesRepository;
        private readonly IContextDriver _contextDriver;
        private readonly Func<Task> _init;

        public TestScope(IRulesRepository rules, IContextDriver context, Func<Task> init, Func<Task> dispose)
        {
            mRulesRepository = rules;
            _contextDriver = context;
            _init = init;
            _dispose = dispose;
        }

        public async Task Run(Func<ITweek, IContextDriver, Task> test)
        {
            Exception e = null;
            try
            {
                await _init();
                var parserSettings = new ParserSettings((b) =>
                {
                    using (var sha1 = SHA1.Create())
                    {
                        return sha1.ComputeHash(b);
                    }
                },FSharpOption<IDictionary<string, ComparerDelegate>>.Some(new Dictionary<string, ComparerDelegate>())
                    
                );
                var tweek = await Tweek.Create(mRulesRepository, (any)=> JPadRulesParserAdapter.Convert(new JPadParser(parserSettings)));
                await test(tweek, _contextDriver);
            }
            catch (Exception ex)
            {
                e = ex;
            }
            await _dispose();
            if (e != null) throw e;
        }
    }
}
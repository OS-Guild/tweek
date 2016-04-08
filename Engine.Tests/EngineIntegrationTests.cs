﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Cassandra;
using Engine.DataTypes;
using Engine.Drivers.Context;
using Engine.Drivers.Rules;
using Engine.Rules.Creation;
using Engine.Tests.Helpers;
using Engine.Tests.TestDrivers;
using FsCheck;
using Newtonsoft.Json;
using NUnit.Framework;
using Tweek.JPad.Generator;
using MatcherData = System.Collections.Generic.Dictionary<string, object>;

namespace Engine.Tests
{
    [TestFixture]
    public class EngineIntegrationTests
    {
        ISession _cassandraSession;
        ITestDriver driver;
        Dictionary<Identity, Dictionary<string, string>> contexts;
        Dictionary<string, RuleDefinition> rules;
        string[] paths;

        readonly HashSet<Identity> NoIdentities = new HashSet<Identity>();
        readonly Dictionary<Identity, Dictionary<string, string>> EmptyContexts = new Dictionary<Identity, Dictionary<string, string>>();

        [TestFixtureSetUp]
        public void Setup()
        {
            var cluster = Cluster.Builder()
                .WithQueryOptions(new QueryOptions().SetConsistencyLevel(ConsistencyLevel.All))
                .AddContactPoints("dc0vm1tqwdso6zqj26c.eastus.cloudapp.azure.com",
                    "dc0vm0tqwdso6zqj26c.eastus.cloudapp.azure.com")
                .Build();

            _cassandraSession = cluster.Connect("tweekintegrationtests");
            driver = new CassandraTestDriver(_cassandraSession);
        }

        async Task Run(Func<ITweek, Task> test)
        {
            var scope = driver.SetTestEnviornment(contexts, paths, rules);
            await scope.Run(test);
        }

        [Test]
        public async Task CalculateSingleValue()
        {
            contexts = EmptyContexts;
            paths = new[] {"abc/somepath"};
            rules = new Dictionary<string, RuleDefinition>
            {
                ["abc/somepath"] = JPadGenerator.New().AddSingleVariantRule(matcher: "{}", value: "SomeValue").Generate()
            };

            await Run(async tweek =>
            {
                var val = await tweek.Calculate("_", NoIdentities);
                Assert.AreEqual("SomeValue", val["abc/somepath"].Value);

                val = await tweek.Calculate("abc/_", NoIdentities);
                Assert.AreEqual( "SomeValue", val["somepath"].Value);

                val = await tweek.Calculate("abc/somepath", NoIdentities);
                Assert.AreEqual( "SomeValue", val[""].Value);
            });
        }

        [Test]
        public async Task CalculateMultipleValues()
        {
            contexts = EmptyContexts;
            paths = new[] { "abc/somepath", "abc/otherpath", "abc/nested/somepath", "def/somepath" };
            rules = paths.ToDictionary(x => x,
                x => JPadGenerator.New().AddSingleVariantRule(matcher: "{}", value: "SomeValue").Generate());

            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", NoIdentities);
                Assert.AreEqual(3, val.Count);
                Assert.AreEqual("SomeValue",val["somepath"].Value);
                Assert.AreEqual("SomeValue",val["otherpath"].Value);
                Assert.AreEqual("SomeValue",val["nested/somepath"].Value);
            });
        }

        [Test]
        public async Task CalculateFilterByMatcher()
        {
            contexts = ContextCreator.Merge(ContextCreator.Create("device", "1"), 
                                            ContextCreator.Create("device", "2", new[] { "SomeDeviceProp", "10" }),
                                            ContextCreator.Create("device", "3", new[] { "SomeDeviceProp", "5" }));

            paths = new[] { "abc/somepath" };
            rules = new Dictionary<string, RuleDefinition>
            {
                ["abc/somepath"] = JPadGenerator.New().AddSingleVariantRule(matcher: JsonConvert.SerializeObject(new MatcherData
                        {
                            ["device.SomeDeviceProp"]= 5
                        }), value: "SomeValue").Generate()
            };

            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1") });
                Assert.AreEqual(0, val.Count);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "2") });
                Assert.AreEqual(0, val.Count);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "3") });
                Assert.AreEqual("SomeValue", val["somepath"].Value);
            });
        }

        [Test]
        public async Task CalculateFilterByMatcherWithMultiIdentities()
        {
            contexts = ContextCreator.Merge(
                                               ContextCreator.Create("user", "1", new[] { "SomeUserProp", "10" }),
                                               ContextCreator.Create("device", "1", new[] { "SomeDeviceProp", "5" }));
            paths = new[] { "abc/somepath" };
            rules = new Dictionary<string, RuleDefinition>
            {
                ["abc/somepath"] = JPadGenerator.New().AddSingleVariantRule(matcher: JsonConvert.SerializeObject(new MatcherData
                {
                    ["device.SomeDeviceProp"] = 5,
                    ["user.SomeUserProp"] = 10
                }), value: "SomeValue").Generate()
            };

            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1") });
                Assert.AreEqual(0, val.Count);
                
                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("user", "1") });
                Assert.AreEqual(0, val.Count);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1"), new Identity("user", "1") });
                Assert.AreEqual("SomeValue", val["somepath"].Value);
            });
        }

        [Test] 
        public async Task MultipleRules()
        {
            contexts = ContextCreator.Create("device", "1");
            paths = new[] { "abc/somepath" };
            rules = new Dictionary<string, RuleDefinition>
            {
                ["abc/otherpath"] = JPadGenerator.New().AddSingleVariantRule(matcher: "{}", value: "BadValue").Generate(),
                ["abc/somepath"] = JPadGenerator.New().AddSingleVariantRule(matcher: "{}", value: "SomeValue")
                                                      .AddSingleVariantRule(matcher: "{}", value: "BadValue").Generate(),
            };

            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1") });
                Assert.AreEqual( "SomeValue", val["somepath"].Value);
            });
        }

        [Test]
        public async Task MultipleRulesWithFallback()
        {
            contexts = ContextCreator.Create("device", "1", new[] { "SomeDeviceProp", "5" });
            paths = new[] { "abc/somepath" };

            rules = new Dictionary<string, RuleDefinition>
            {
                ["abc/somepath"] = JPadGenerator.New().AddSingleVariantRule(matcher: JsonConvert.SerializeObject(new MatcherData()
                {
                    { "device.SomeDeviceProp", 10}
                }), value: "BadValue")
                .AddSingleVariantRule(matcher: JsonConvert.SerializeObject(new Dictionary<string, object>()
                {
                    {"device.SomeDeviceProp", 5}
                }), value: "SomeValue").Generate(),
            };


            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1") });
                Assert.AreEqual("SomeValue", val["somepath"].Value);
            });
        }

        [Test]
        public async Task CalculateWithMultiVariant()
        {
            contexts = ContextCreator.Create("device", "1", new[] { "SomeDeviceProp", "5"}, new []{"@CreationDate", "10/10/10" });
            paths = new[] { "abc/somepath" };
            rules = new Dictionary<string, RuleDefinition>()
            {
                ["abc/somepath"] =
                    JPadGenerator.New()
                        .AddMultiVariantRule(matcher: JsonConvert.SerializeObject(new Dictionary<string, object>()
                        {
                            {"device.SomeDeviceProp", 5}
                        }), valueDistrubtions: new Dictionary<DateTimeOffset, string>
                        {
                            {
                                DateTimeOffset.Parse("08/08/08"), JsonConvert.SerializeObject(new
                                {
                                    type = "bernoulliTrial",
                                    args = 0.5
                                })
                            }
                        }, ownerType: "device").Generate()
            };


            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", new HashSet<Identity> { });
                Assert.AreEqual(0, val.Count);
                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1")});
                Assert.IsTrue(val["somepath"].Value == "true" || val["somepath"].Value == "false");
                await Task.WhenAll(Enumerable.Range(0, 10).Select(async x =>
                {
                    Assert.AreEqual((await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1") }))["somepath"].Value, val["somepath"].Value);
                }));
            });
        }

        [Test]
        public async Task MultiVariantWithMultipleValueDistrubtion()
        {
            contexts = ContextCreator.Merge(
                       ContextCreator.Create("device", "1", new[] { "@CreationDate", "05/05/05" }),
                       ContextCreator.Create("device", "2", new[] { "@CreationDate", "07/07/07" }),
                       ContextCreator.Create("device", "3", new[] { "@CreationDate", "09/09/09" }),
                       ContextCreator.Create("user", "4", new[] { "@CreationDate", "09/09/09" }));

            paths = new[] { "abc/somepath" };
            rules = new Dictionary<string, RuleDefinition>()
            {
                ["abc/somepath"] = JPadGenerator.New().AddMultiVariantRule(matcher: "{}",
                    valueDistrubtions: new Dictionary<DateTimeOffset, string>
                    {
                        [DateTimeOffset.Parse("06/06/06")] = JsonConvert.SerializeObject(new
                        {
                            type = "bernoulliTrial",
                            args = 1
                        }),
                        [DateTimeOffset.Parse("08/08/08")] = JsonConvert.SerializeObject(new
                        {
                            type = "bernoulliTrial",
                            args = 0
                        })
                    }, ownerType: "device").Generate()
            };

            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1") });
                Assert.AreEqual(0, val.Count);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "2") });
                Assert.AreEqual("true", val["somepath"].Value);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "3") });
                Assert.AreEqual("false", val["somepath"].Value);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("user", "4") });
                Assert.AreEqual(0, val.Count);
            });
        }

        [Test]
        public async Task CalculateWithFixedValue()
        {
            contexts = ContextCreator.Merge(ContextCreator.Create("device", "1", new[] { "@fixed:abc/somepath", "FixedValue" }),
                                            ContextCreator.Create("device", "2", new[] { "SomeDeviceProp", "5" }),
                                            ContextCreator.Create("device", "3", new[] { "SomeDeviceProp", "5" }, new[] { "@fixed:abc/somepath", "FixedValue" }));

            paths = new[] { "abc/somepath" };
            rules = new Dictionary<string, RuleDefinition>()
            {
                ["abc/somepath"] = JPadGenerator.New().AddSingleVariantRule(matcher: JsonConvert.SerializeObject(new Dictionary<string, object>()
            {
                {"device.SomeDeviceProp", 5}
            }), value: "RuleBasedValue").Generate()
            };


            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1") });
                Assert.AreEqual("FixedValue", val["somepath"].Value);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "2") });
                Assert.AreEqual("RuleBasedValue", val["somepath"].Value);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "3") });
                Assert.AreEqual("FixedValue", val["somepath"].Value);
                
            });
        }

        [Test]
        public async Task CalculateWithRecursiveMatcher()
        {
            contexts = ContextCreator.Merge(
                            ContextCreator.Create("device", "1", new[] { "SomeDeviceProp", "5" }),
                            ContextCreator.Create("device", "2", new[] { "@fixed:abc/dep_path2", "true" }, new[] { "SomeDeviceProp", "5" })
                            );

            paths = new[] { "abc/somepath", "abc/dep_path1", "abc/dep_path2" };

            rules = new Dictionary<string, RuleDefinition>()
            {
                ["abc/dep_path1"] = JPadGenerator.New().AddSingleVariantRule(matcher: JsonConvert.SerializeObject(new Dictionary<string, object>()
            {
                {"device.SomeDeviceProp", 5}
            }), value: "true").Generate(),
                ["abc/somepath"] = JPadGenerator.New().AddSingleVariantRule(matcher: JsonConvert.SerializeObject(new Dictionary<string, object>()
            {
                {"@@key:abc/dep_path1", true},
                {"@@key:abc/dep_path2", true}
            }),
                value: "true").Generate()
            };

            await Run(async tweek =>
            {
                var val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "1") });
                Assert.AreEqual(1, val.Count);
                Assert.AreEqual("true", val["dep_path1"].Value);

                val = await tweek.Calculate("abc/_", new HashSet<Identity> { new Identity("device", "2") });
                Assert.AreEqual(3, val.Count);
                Assert.AreEqual("true", val["dep_path1"].Value);
                Assert.AreEqual("true", val["dep_path2"].Value);
                Assert.AreEqual("true", val["somepath"].Value);
            });
        }

    }
}

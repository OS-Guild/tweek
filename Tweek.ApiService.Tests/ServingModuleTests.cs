﻿using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using RestEase;
using Xunit;

namespace Tweek.ApiService.Tests
{
    public class ServingModuleTests
    {
        private readonly Dictionary<string, string> mEmptyContext;
        private readonly IConfigurationsApi mConfigurationsApi;

        public ServingModuleTests()
        {
            var targetBaseUrl = Environment.GetEnvironmentVariable("TWEEK_SMOKE_TARGET");

            if (string.IsNullOrEmpty(targetBaseUrl))
            {
                throw new ArgumentException("Missing smoke tests target environment variable, make sure you set up 'TWEEK_SMOKE_TARGET' to the target hostname.");
            }

            mConfigurationsApi = RestClient.For<IConfigurationsApi>(targetBaseUrl);
            mEmptyContext = new Dictionary<string, string>();
        }

        [Fact]
        public async Task GetSingleKey_NoRules_ShouldReturnDefaultKeyValue()
        {
            // Arrange

            // Act
            var response = await mConfigurationsApi.Get("@tests/simple", mEmptyContext);

            // Assert
            Assert.Equal(JTokenType.String, response.Type);
            Assert.Equal("test", response.ToString());
        }

        [Fact]
        public async Task GetKeyTree_NoRules_ShouldReturnObjectWithDefaultValuesForAllKeys()
        {
            // Arrange

            // Act
            var response = await mConfigurationsApi.Get("@tests/nested/_", mEmptyContext);

            // Assert
            Assert.Equal(JTokenType.Object, response.Type);
            Assert.Equal("test", response.Value<string>("key1"));
            Assert.Equal("test", response.Value<string>("key2"));
        }
    }
}

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using FSharpUtils.Newtonsoft;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RestEase;
using Tweek.Utils;
using Xunit.Abstractions;

namespace Tweek.ApiService.SmokeTests
{
    public class TweekApi : ITweekApi
    {
        private readonly HttpClient _client;

        public TweekApi(HttpClient client)
        {
            _client = client;
        }

        public async Task AppendContext(string identityType, string identityId, Dictionary<string, JsonValue> context)
        {
            await _client.PostAsync(
                $"/api/v1/context/{identityType}/{identityId}", new StringContent(JsonConvert.SerializeObject(context, new JsonValueConverter()), Encoding.UTF8, "application/json"));
        }

        public async Task RemoveFromContext(string identityType, string identityId, string property)
        {
            await _client.DeleteAsync($"/api/v1/context/{identityType}/{identityId}/{property}");
        }

        public async Task<JToken> GetSwagger()
        {
            var stream = await _client.GetStreamAsync("/api/swagger.json");

            return JToken.Load(new JsonTextReader(new StreamReader(stream)));
        }

        public async Task<JToken> GetConfigurations(string keyPath, IEnumerable<KeyValuePair<string, string>> context)
        {
            var stream = await _client.GetStreamAsync(
                $"api/v1/keys/{keyPath}?{string.Join("&", context.Select(x => string.Join("=", x.Key, x.Value)))}");

            return JToken.Load(new JsonTextReader(new StreamReader(stream)));
        }
    }

    public static class TweekApiServiceFactory
    {
        public static ITweekApi GetTweekApiClient(ITestOutputHelper output)
        {
            var baseUrl = Environment.GetEnvironmentVariable("TWEEK_API_URL") ?? "http://localhost:4003";
            output.WriteLine($"TWEEK_API_URL {baseUrl}");

            return new TweekApi(new HttpClient
            {
                BaseAddress = new Uri(baseUrl)
            });
        }
    }
}

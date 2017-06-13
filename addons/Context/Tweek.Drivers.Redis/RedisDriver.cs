using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Engine.DataTypes;
using Engine.Drivers.Context;
using FSharpUtils.Newtonsoft;
using StackExchange.Redis;
using Newtonsoft.Json.Linq;
using System.Net;
using LanguageExt;
using Newtonsoft.Json;
using Tweek.ApiService.Addons;

namespace Tweek.Drivers.Redis
{
    public class RedisDriver : IContextDriver
    {
        private readonly ConnectionMultiplexer mRedisConnection;

        public string GetKey(Identity identity) => "identity_" + identity.Type + "_" + identity.Id;

        public RedisDriver(string connectionString)
        {
            var options = TranslateDnsToIP(ConfigurationOptions.Parse(connectionString));
            mRedisConnection = ConnectionMultiplexer.Connect(options);
        }

        private ConfigurationOptions TranslateDnsToIP(ConfigurationOptions configurationOptions)
        {
            var endpoints = configurationOptions.EndPoints
                .Select(endpoint => endpoint as DnsEndPoint)
                .SelectMany(endpoint =>
                    Dns.GetHostAddressesAsync(endpoint.Host).Result
                        .Select(ip => new IPEndPoint(ip, endpoint.Port))
                );
            var result = configurationOptions.Clone();
            result.EndPoints.Clear();
            foreach (var endpoint in endpoints)
            {
                result.EndPoints.Add(endpoint);
            }
            return result;
        }

        public async Task AppendContext(Identity identity, Dictionary<string, JsonValue> context)
        {
            var db = mRedisConnection.GetDatabase();
            var id = GetKey(identity);
            HashEntry[] redisContext = context.Select(item =>
                new HashEntry(item.Key, JsonConvert.SerializeObject(item.Value, new JsonSerializerSettings{ContractResolver = new TweekContractResolver()}))
            ).ToArray();

            await db.HashSetAsync(id, redisContext);
        }

        public async Task<Dictionary<string, JsonValue>> GetContext(Identity identity)
        {
            var db = mRedisConnection.GetDatabase();
            var id = GetKey(identity);
            var redisResult = await db.HashGetAllAsync(id);
            var result = new Dictionary<string, JsonValue>(redisResult.Length);

            foreach (var item in redisResult)
            {
                result.Add(item.Name, JsonValue.Parse(item.Value));
            }

            return result;
        }

        public async Task RemoveFromContext(Identity identity, string key)
        {
            var db = mRedisConnection.GetDatabase();
            var id = GetKey(identity);
            await db.HashDeleteAsync(id, key);
        }
    }
}
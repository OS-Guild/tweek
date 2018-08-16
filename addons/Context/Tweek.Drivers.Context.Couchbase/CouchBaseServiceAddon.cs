using System;
using System.Collections.Generic;
using App.Metrics.Health;
using Couchbase;
using Couchbase.Configuration.Client;
using Couchbase.Core.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Tweek.ApiService.Addons;
using Tweek.Engine.Drivers.Context;

namespace Tweek.Drivers.Context.Couchbase
{
    public class StaticCouchbaseDisposer
    {
        public StaticCouchbaseDisposer(IApplicationLifetime lifetime, ILogger<StaticCouchbaseDisposer> logger)
        {
            lifetime.ApplicationStopped.Register(() =>
            {
                logger.LogInformation("Closing Cluster");
                ClusterHelper.Close();
                logger.LogInformation("Cluster closed");
            });
        }
    }

    public class CouchBaseServiceAddon : ITweekAddon
    {
        public void Use(IApplicationBuilder builder, IConfiguration configuration)
        {
        }

        public void Configure(IServiceCollection services, IConfiguration configuration)
        {
            var couchbaseConfig = configuration.GetSection("Couchbase");
            var contextBucketName = couchbaseConfig["BucketName"];
            var contextBucketPassword = couchbaseConfig["Password"];
            var url = couchbaseConfig["Url"];
            var maxLatencyMicroseconds = long.Parse(couchbaseConfig["MaxLatencyMicroseconds"] ?? "0");

            InitCouchbaseCluster(contextBucketName, contextBucketPassword, url);

            var contextDriver = new CouchBaseDriver(ClusterHelper.GetBucket, contextBucketName);
            services.AddSingleton<IContextDriver>(contextDriver);
            services.AddSingleton<HealthCheck>(ctx =>
            {
                ctx.GetService<StaticCouchbaseDisposer>();
                return new BucketConnectionHealthCheck(ClusterHelper.GetBucket, contextBucketName, maxLatencyMicroseconds);
            });
            services.AddSingleton<StaticCouchbaseDisposer>();
        }

        private void InitCouchbaseCluster(string bucketName, string bucketPassword, string url)
        {
            ClusterHelper.Initialize(new ClientConfiguration
            {
                Servers = new List<Uri> {new Uri(url)},
                BucketConfigs = new Dictionary<string, BucketConfiguration>
                {
                    [bucketName] = new BucketConfiguration
                    {
                        BucketName = bucketName,
                        Password = bucketPassword,
                        PoolConfiguration = new PoolConfiguration
                        {
                            MaxSize = 30,
                            MinSize = 5
                        }
                    }
                },
                Serializer = () => new DefaultSerializer(
                    new JsonSerializerSettings
                    {
                        ContractResolver = new TweekContractResolver()
                    },
                    new JsonSerializerSettings
                    {
                        ContractResolver = new TweekContractResolver()
                    })
            });
        }
    }
}
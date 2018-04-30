using FSharpUtils.Newtonsoft;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Tweek.Engine.DataTypes;
using Tweek.Engine.Drivers.Context;

namespace Tweek.ApiService.MultiContext
{
    public class MultiDriver : IContextDriver
    {
        private readonly IEnumerable<IContextDriver> _readers;
        private readonly IEnumerable<IContextDriver> _writers;

        public MultiDriver(IEnumerable<IContextDriver> readers, IEnumerable<IContextDriver> writers)
        {
            if (readers == null || !readers.Any())
            {
                throw new ArgumentException("Missing readers", nameof(readers));
            }

            if (writers == null || !writers.Any())
            {
                throw new ArgumentException("Missing writers", nameof(writers));
            }

            _readers = readers;
            _writers = writers;
        }

        public async Task AppendContext(Identity identity, Dictionary<string, JsonValue> context)
        {
            var tasks = new List<Task>(_writers.Length());
            foreach (var contextDriver in _writers)
            {
                tasks.Add(contextDriver.AppendContext(identity, context));
            }
            await Task.WhenAll(tasks);
        }

        public async Task<Dictionary<string, JsonValue>> GetContext(Identity identity)
        {
            Exception lastException = null;
            foreach (var contextDriver in _readers)
            {
                try
                {
                    return await contextDriver.GetContext(identity);
                }
                catch (Exception e)
                {
                    lastException = e;
                }
            }

            throw lastException;
        }

        public async Task RemoveFromContext(Identity identity, string key)
        {
            var tasks = new List<Task>(_writers.Length());
            foreach (var contextDriver in _writers)
            {
                tasks.Add(contextDriver.RemoveFromContext(identity, key));
            }
            await Task.WhenAll(tasks);
        }
    }
}

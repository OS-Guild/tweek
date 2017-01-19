using System.Collections.Generic;
using System.Linq;
using Engine.DataTypes;

namespace Engine.Tests.Helpers
{
    public static class ContextCreator
    {
        public static Dictionary<Identity, Dictionary<string, string>> Create(string identityType, string identityId, params string[][] contextValues){
            return new Dictionary<Identity, Dictionary<string, string>>
            {
                {new Identity(identityType, identityId), contextValues.ToDictionary(x=>x[0], x=>x[1])}
            };
        }

        public static Dictionary<Identity, Dictionary<string, string>> Merge(
            params Dictionary<Identity, Dictionary<string, string>>[] contexts)
        {
            return contexts.AsEnumerable().Aggregate((a,b)=>a.Concat(b).ToDictionary(x => x.Key, x => x.Value));
        }
    }
}
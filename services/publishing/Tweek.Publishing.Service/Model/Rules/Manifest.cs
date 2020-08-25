using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Tweek.Publishing.Service.Model.Rules
{
    public static class ManifestExtensions
    {
        public static string[] GetDependencies(this Manifest manifest)
        {
            switch (manifest.Implementation.Type)
            {
                case "alias":
                    return new[] {manifest.Implementation.Key};
                default:
                    return manifest.Dependencies ?? new string[] { };
            }
        }

        public static string GetFileImplementationPath(this Manifest manifest) => 
            $"implementations/{manifest.Implementation.Format}/{manifest.KeyPath}.{manifest.Implementation.Extension ?? manifest.Implementation.Format}";
    }

    public class Manifest
    {
        public class MImplementation
        {
            [JsonProperty("format")]
            public string Format;

            [JsonProperty("type")]
            public string Type;

            [JsonProperty("extension")]
            public string Extension;

            [JsonProperty("value")]
            public JToken Value;

            [JsonProperty("key")]
            public string Key;
        }
        
        public class MMeta
        {
            [JsonProperty("tags")]
            public string[] Tags;
        }

        [JsonProperty("dependencies")]
        public string[] Dependencies;

        [JsonProperty("implementation")]
        public MImplementation Implementation;

        [JsonProperty("key_path")]
        public string KeyPath;
        
        [JsonProperty("meta")]
        public MMeta Meta;
    }
}
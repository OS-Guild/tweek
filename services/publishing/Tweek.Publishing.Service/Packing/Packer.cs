using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json;

namespace Tweek.Publishing.Service.Packing
{
    public class Packer
    {
        public Dictionary<string,KeyDef> Pack(ICollection<string> files, Func<string,string> readFn){
             return new Dictionary<string, KeyDef>(files.Where(x=> Regex.IsMatch(x, "^manifests/.*\\.json$"))
                   .Select(x =>{
                       try {
                            return JsonConvert.DeserializeObject<Manifest>(readFn(x));
                       } catch (Exception ex){
                           ex.Data["key"] = x;
                           throw;
                       }
                   })
                   .Select(manifest => {
                       var keyDef = new KeyDef
                       {
                           Format = manifest.Implementation.Format ?? manifest.Implementation.Type,
                           Dependencies = manifest.GetDependencies()
                       };
                       
                       switch (manifest.Implementation.Type){
                           case "file":
                               keyDef.Payload = readFn($"implementations/{manifest.Implementation.Format}/{manifest.KeyPath}.{manifest.Implementation.Extension ?? manifest.Implementation.Format}");
                               break;
                           case "const":
                               keyDef.Payload = JsonConvert.SerializeObject(manifest.Implementation.Value);
                               break;
                           case "alias":
                               keyDef.Payload = manifest.Implementation.Key;
                               break;
                       }
                       return (keyPath:manifest.KeyPath, keyDef: keyDef);
                   })
                   .ToDictionary(x=>x.keyPath, x=>x.keyDef));
                   

        }
    }
}
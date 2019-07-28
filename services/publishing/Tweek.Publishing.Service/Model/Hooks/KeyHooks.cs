using System.Text.RegularExpressions;
using System.Linq;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Tweek.Publishing.Service.Model.Hooks {
  public class KeyHooks {
    [JsonProperty("keyPath")]
    private string _keyPath;
    [JsonProperty("hooks")]
    private Hook[] _hooks;
    private readonly Regex _matchingKeyRegex;

    public KeyHooks(string keyPath, Hook[] hooks) {
      this._keyPath = keyPath;
      this._hooks = hooks;

      var keyPathForRegex = this._keyPath.Replace("*", ".*");
      this._matchingKeyRegex = new Regex($"^{keyPathForRegex}$", RegexOptions.Compiled);
    }

    public Hook[] GetHooks() => _hooks;

    public bool MatchesKeyPath(string keyPath) => _matchingKeyRegex.IsMatch(keyPath);

    public IEnumerable<string> GetMatchingKeyPaths(IEnumerable<string> keyPaths) {
      return keyPaths.Where( keyPath => MatchesKeyPath(keyPath) );
    }
  }
}
using System.Text;
using System.Net.Http;
using System.Threading.Tasks;
using System;
using Tweek.Publishing.Service.Utils;
using Newtonsoft.Json;

namespace Tweek.Publishing.Service.Model.Hooks {
  public class Hook {
    [JsonProperty("type")]
    private string _type;
    [JsonProperty("url")]
    private string _url;

    public Hook(string type, string url) {
      this._type = type;
      this._url = url;
    }

    public async Task Trigger(string payload) {
      switch (_type) {
        case "notification_webhook":
          await TriggerNotificationWebhook(payload);
          break;
        default:
          throw new Exception($"Failed to trigger hook, invalid type: {_type}");
      }
    }

    private async Task TriggerNotificationWebhook(string payload) {
      var qq = new StringContent(payload, Encoding.UTF8, "application/json");
      var response = await Http.GetClient().PostAsync(_url, new StringContent(payload, Encoding.UTF8, "application/json"));
      response.EnsureSuccessStatusCode();
    }

    public override bool Equals(object obj) {
      if (obj == null || this.GetType() != obj.GetType()) return false;
      
      var otherHook = (Hook)obj;
      return this._type == otherHook._type && this._url == otherHook._url;
    }

    public override int GetHashCode() {
      return $"{_type}-${_url}".GetHashCode();
    }
  }
}
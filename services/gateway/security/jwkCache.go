package security

import (
	"fmt"
	"time"

	"github.com/lestrrat-go/jwx/jwk"
	"github.com/sirupsen/logrus"
)

var jwkCache map[string]*jwk.Set

func init() {
	jwkCache = map[string]*jwk.Set{}
}

func getJWKByEndpoint(endpoint, keyID string) (interface{}, error) {
	keys := jwkCache[endpoint]
	if keys == nil {
		return nil, fmt.Errorf("No keys found for endpoint %s", endpoint)
	}
	k := keys.LookupKeyID(keyID)
	if len(k) == 0 {
		loadEndpoint(endpoint)
		keys = jwkCache[endpoint]
		k = keys.LookupKeyID(keyID)
		if len(k) == 0 {
			return nil, fmt.Errorf("Key %s not found at %s", keyID, endpoint)
		}
	}
	if len(k) > 1 {
		return nil, fmt.Errorf("Unexpected error, more than 1 key %s found at %s", keyID, endpoint)
	}
	return k[0].Materialize()
}

// LoadAllEndpoints loads all the endpoints
func LoadAllEndpoints(endpoints []string) {
	for _, ep := range endpoints {
		loadEndpoint(ep)
	}
}

// RefreshEndpoints refreshes endpoints
func RefreshEndpoints(endpoints []string) {
	ticker := time.NewTicker(time.Hour * 24)
	go func() {
		for true {
			<-ticker.C
			for _, ep := range endpoints {
				loadEndpoint(ep)
			}
		}
	}()
}

func loadEndpoint(endpoint string) {
	keySet, err := jwk.FetchHTTP(endpoint)
	if err != nil {
		logrus.WithError(err).WithField("endpoint", endpoint).Error("Unable to load keys for endpoint")
	}
	jwkCache[endpoint] = keySet
}

package handlers

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"runtime"
	"sync"

	"github.com/nats-io/go-nats"

	"github.com/Soluto/tweek/services/gateway/appConfig"
)

var repoRevision string

// NewStatusHandler - handler function that returns versions for all services
func NewStatusHandler(config *appConfig.Upstreams) http.HandlerFunc {
	services := map[string]string{
		"api":        config.API,
		"authoring":  config.Authoring,
		"publishing": config.Publishing,
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var wg sync.WaitGroup
		wg.Add(len(services))

		result := map[string]interface{}{}
		serviceStatuses := map[string]interface{}{}
		isHealthy := true

		for serviceName, serviceHost := range services {
			go func(name, host string, statuses map[string]interface{}, wgroup *sync.WaitGroup) {
				serviceStatus, serviceIsHealthy := checkServiceStatus(name, host)
				statuses[name] = serviceStatus
				if !serviceIsHealthy {
					isHealthy = false
				}
				wgroup.Done()
			}(serviceName, serviceHost, serviceStatuses, &wg)
		}
		wg.Wait()

		result["services"] = serviceStatuses
		result["repository revision"] = repoRevision

		if !isHealthy {
			result["message"] = "not all services are healthy"
		}

		js, err := json.Marshal(result)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if !isHealthy {
			w.WriteHeader(http.StatusServiceUnavailable)
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(js)
	}
}

// SetupRevisionUpdater creates revision updater
func SetupRevisionUpdater(natsEndpoint string) {
	nc, err := nats.Connect(natsEndpoint)
	if err != nil {
		log.Panicln("Failed to connect to nats on", natsEndpoint)
	}

	sub, err := nc.Subscribe("version", func(msg *nats.Msg) {
		repoRevision = string(msg.Data)
	})
	if err != nil {
		log.Panicln("Failed to subscribe to subject 'version' on", natsEndpoint)
	}
	runtime.SetFinalizer(repoRevision, func(interface{}) {
		if sub != nil && sub.IsValid() {
			sub.Unsubscribe()
		}
	})
}

func checkServiceStatus(serviceName string, serviceHost string) (interface{}, bool) {
	resp, err := http.Get(fmt.Sprintf("%s/health", serviceHost))

	if err != nil || resp == nil {
		log.Printf("Service health request for %s failed with error: %v\n", serviceName, err)
		return "Service health request failed", false
	}
	defer resp.Body.Close()
	contents, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Service health request for %s read failed with error: %v\n", serviceName, err)
		return "Service health request cannot be read", false
	}
	var status map[string]interface{}
	err = json.Unmarshal(contents, &status)
	if err != nil {
		log.Printf("Service health request for %s JSON parse failed with error: %v\n", serviceName, err)
		return "Service health request responded with bad format", false
	}
	if resp.StatusCode > 400 {
		return status, false
	}
	return status, true
}

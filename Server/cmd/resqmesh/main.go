package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/Valtriaz/ResQMesh/Server/internal/api"
	"github.com/Valtriaz/ResQMesh/Server/internal/storage"
)

func main() {
	addr :=
		getenv(
			"RESQMESH_ADDR",
			"0.0.0.0:5000",
		)

	dbPath :=
		getenv(
			"RESQMESH_DB",
			"./data/resqmesh.db",
		)

	database, err :=
		storage.NewDatabase(
			dbPath,
		)

	if err != nil {
		log.Fatalf(
			"database initialization failed: %v",
			err,
		)
	}

	defer func() {
		if err := database.Close(); err != nil {
			log.Printf(
				"database close error: %v",
				err,
			)
		}
	}()

	emergencyHandler :=
		api.NewEmergencyHandler(
			database,
		)

	mux :=
		http.NewServeMux()

	mux.HandleFunc(
		"/api/health",
		healthHandler,
	)

	mux.HandleFunc(
		"/api/emergencies",
		emergencyHandler.Handle,
	)

	server :=
		&http.Server{
			Addr:    addr,
			Handler: withCORS(mux),
		}

	log.Printf(
		"ResQMesh server listening on %s",
		addr,
	)

	log.Printf(
		"Database: %s",
		dbPath,
	)

	if err :=
		server.ListenAndServe(); err != nil &&
		err != http.ErrServerClosed {
		log.Fatalf(
			"server failed: %v",
			err,
		)
	}
}

func healthHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodGet {
		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]string{
				"error": "method not allowed",
			},
		)

		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"status":  "online",
			"service": "ResQMesh Server",
		},
	)
}

func withCORS(
	next http.Handler,
) http.Handler {
	return http.HandlerFunc(
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			w.Header().Set(
				"Access-Control-Allow-Origin",
				"*",
			)

			w.Header().Set(
				"Access-Control-Allow-Headers",
				"Content-Type",
			)

			w.Header().Set(
				"Access-Control-Allow-Methods",
				"GET, POST, OPTIONS",
			)

			if r.Method ==
				http.MethodOptions {
				w.WriteHeader(
					http.StatusNoContent,
				)

				return
			}

			next.ServeHTTP(w, r)
		},
	)
}

func writeJSON(
	w http.ResponseWriter,
	status int,
	value any,
) {
	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	w.WriteHeader(status)

	if err :=
		json.NewEncoder(w).
			Encode(value); err != nil {
		log.Printf(
			"JSON encoding error: %v",
			err,
		)
	}
}

func getenv(
	key string,
	fallback string,
) string {
	value :=
		os.Getenv(key)

	if value == "" {
		return fallback
	}

	return value
}

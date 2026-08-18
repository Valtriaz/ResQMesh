package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/Valtriaz/ResQMesh/Server/internal/storage"
)

type EmergencyRequest struct {
	Type      string  `json:"type"`
	Severity  string  `json:"severity"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type EmergencyHandler struct {
	DB *storage.Database
}

func NewEmergencyHandler(
	db *storage.Database,
) *EmergencyHandler {
	return &EmergencyHandler{
		DB: db,
	}
}

func (h *EmergencyHandler) Handle(
	w http.ResponseWriter,
	r *http.Request,
) {
	switch r.Method {
	case http.MethodPost:
		h.create(w, r)

	case http.MethodGet:
		h.list(w)

	case http.MethodOptions:
		w.WriteHeader(http.StatusNoContent)

	default:
		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]string{
				"error": "method not allowed",
			},
		)
	}
}

func (h *EmergencyHandler) create(
	w http.ResponseWriter,
	r *http.Request,
) {
	defer r.Body.Close()

	var request EmergencyRequest

	decoder :=
		json.NewDecoder(r.Body)

	if err := decoder.Decode(
		&request,
	); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "invalid JSON body",
			},
		)

		return
	}

	request.Type =
		strings.ToUpper(
			strings.TrimSpace(
				request.Type,
			),
		)

	request.Severity =
		strings.ToUpper(
			strings.TrimSpace(
				request.Severity,
			),
		)

	if request.Type == "" {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "type is required",
			},
		)

		return
	}

	if request.Severity == "" {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "severity is required",
			},
		)

		return
	}

	emergency :=
		storage.Emergency{
			Type:      request.Type,
			Severity:  request.Severity,
			Latitude:  request.Latitude,
			Longitude: request.Longitude,
			Status:    "received",
			CreatedAt: time.Now().UTC(),
		}

	created, err :=
		h.DB.CreateEmergency(
			emergency,
		)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": err.Error(),
			},
		)

		return
	}

	writeJSON(
		w,
		http.StatusCreated,
		created,
	)
}

func (h *EmergencyHandler) list(
	w http.ResponseWriter,
) {
	emergencies, err :=
		h.DB.ListEmergencies(100)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": err.Error(),
			},
		)

		return
	}

	writeJSON(
		w,
		http.StatusOK,
		emergencies,
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

	if err := json.NewEncoder(w).Encode(
		value,
	); err != nil {
		http.Error(
			w,
			"failed to encode response",
			http.StatusInternalServerError,
		)
	}
}

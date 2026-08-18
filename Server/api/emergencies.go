package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Valtriaz/ResQMesh/Server/storage"
	resqws "github.com/Valtriaz/ResQMesh/Server/websocket"
)

type EmergencyRequest struct {
	Type      string   `json:"type"`
	Severity  string   `json:"severity"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
}

type StatusRequest struct {
	Status string `json:"status"`
}

type EmergencyHandler struct {
	DB  *storage.Database
	Hub *resqws.Hub
}

func NewEmergencyHandler(
	db *storage.Database,
	hub *resqws.Hub,
) *EmergencyHandler {
	return &EmergencyHandler{
		DB:  db,
		Hub: hub,
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

	case http.MethodPatch:
		h.updateStatus(w, r)

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

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "invalid JSON body",
			},
		)

		return
	}

	request.Type = strings.ToUpper(
		strings.TrimSpace(request.Type),
	)

	request.Severity = strings.ToUpper(
		strings.TrimSpace(request.Severity),
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

	emergency := storage.Emergency{
		Type:      request.Type,
		Severity:  request.Severity,
		Latitude:  request.Latitude,
		Longitude: request.Longitude,
		Status:    "received",
		CreatedAt: time.Now().UTC(),
	}

	created, err := h.DB.CreateEmergency(emergency)
	if err != nil {
		log.Printf(
			"FAILED TO STORE EMERGENCY: %v",
			err,
		)

		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": err.Error(),
			},
		)

		return
	}

	h.Hub.Broadcast(
		map[string]any{
			"event": "emergency.created",
			"data":  created,
		},
	)

	writeJSON(
		w,
		http.StatusCreated,
		created,
	)
}

func (h *EmergencyHandler) list(
	w http.ResponseWriter,
) {
	emergencies, err := h.DB.ListEmergencies(100)
	if err != nil {
		log.Printf(
			"FAILED TO READ EMERGENCIES: %v",
			err,
		)

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

func (h *EmergencyHandler) updateStatus(
	w http.ResponseWriter,
	r *http.Request,
) {
	idText := strings.TrimPrefix(
		r.URL.Path,
		"/api/emergencies/",
	)

	id, err := strconv.ParseInt(
		idText,
		10,
		64,
	)

	if err != nil || id <= 0 {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "invalid emergency id",
			},
		)

		return
	}

	defer r.Body.Close()

	var request StatusRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "invalid JSON body",
			},
		)

		return
	}

	request.Status = strings.ToLower(
		strings.TrimSpace(request.Status),
	)

	if request.Status != "received" &&
		request.Status != "resolved" {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "status must be received or resolved",
			},
		)

		return
	}

	if err := h.DB.UpdateEmergencyStatus(
		id,
		request.Status,
	); err != nil {
		log.Printf(
			"FAILED TO UPDATE EMERGENCY %d: %v",
			id,
			err,
		)

		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": err.Error(),
			},
		)

		return
	}

	updated, err := h.DB.GetEmergency(id)
	if err != nil {
		log.Printf(
			"FAILED TO READ UPDATED EMERGENCY %d: %v",
			id,
			err,
		)

		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": err.Error(),
			},
		)

		return
	}

	h.Hub.Broadcast(
		map[string]any{
			"event": "emergency.updated",
			"data":  updated,
		},
	)

	writeJSON(
		w,
		http.StatusOK,
		updated,
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

	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf(
			"JSON encoding error: %v",
			err,
		)
	}
}

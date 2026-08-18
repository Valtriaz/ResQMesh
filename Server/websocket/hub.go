package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	gorilla "github.com/gorilla/websocket"
)

type Hub struct {
	clients map[*gorilla.Conn]struct{}
	mu      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*gorilla.Conn]struct{}),
	}
}

func (h *Hub) AddClient(conn *gorilla.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[conn] = struct{}{}
}

func (h *Hub) RemoveClient(conn *gorilla.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	delete(h.clients, conn)

	_ = conn.Close()
}

func (h *Hub) Broadcast(value any) {
	payload, err := json.Marshal(value)
	if err != nil {
		log.Printf("WebSocket marshal error: %v", err)
		return
	}

	h.mu.RLock()

	clients := make([]*gorilla.Conn, 0, len(h.clients))

	for client := range h.clients {
		clients = append(clients, client)
	}

	h.mu.RUnlock()

	for _, client := range clients {
		if err := client.WriteMessage(
			gorilla.TextMessage,
			payload,
		); err != nil {
			log.Printf("WebSocket write error: %v", err)
		}
	}
}

func (h *Hub) Handler() http.HandlerFunc {
	upgrader := gorilla.Upgrader{
		CheckOrigin: func(_ *http.Request) bool {
			return true
		},
	}

	return func(
		w http.ResponseWriter,
		r *http.Request,
	) {
		conn, err := upgrader.Upgrade(
			w,
			r,
			nil,
		)

		if err != nil {
			log.Printf(
				"WebSocket upgrade error: %v",
				err,
			)
			return
		}

		h.AddClient(conn)

		log.Printf(
			"WebSocket client connected: %s",
			r.RemoteAddr,
		)

		defer func() {
			h.RemoveClient(conn)

			log.Printf(
				"WebSocket client disconnected: %s",
				r.RemoteAddr,
			)
		}()

		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}
}

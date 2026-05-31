package controller

import (
	"bufio"
	"encoding/json"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	utils "reverse-http/Utils"
	db "reverse-http/db/sqlc"
)

const (
	oauthStreamBufferSize    = 16
	oauthStreamMaxClients    = 3
	oauthStreamHeartbeat     = 15 * time.Second
	oauthStreamMaxConnection = 6 * time.Minute
)

type OAuthStreamEvent struct {
	Provider string `json:"provider"`
	Phase    string `json:"phase"`
	Endpoint string `json:"endpoint"`
	RouteID  string `json:"route_id"`
	Time     string `json:"time"`
}

type oauthStreamClient struct {
	id uint64
	ch chan OAuthStreamEvent
}

type OAuthStreamHub struct {
	mu      sync.RWMutex
	nextID  uint64
	clients map[string]map[uint64]*oauthStreamClient
}

func NewOAuthStreamHub() *OAuthStreamHub {
	return &OAuthStreamHub{
		clients: make(map[string]map[uint64]*oauthStreamClient),
	}
}

func validOAuthFlowID(flowID string) bool {
	_, err := uuid.Parse(flowID)
	return err == nil
}

func validOAuthProvider(provider string) bool {
	return provider == "github" || provider == "google"
}

func (h *OAuthStreamHub) Add(flowID string) (*oauthStreamClient, bool) {
	if !validOAuthFlowID(flowID) {
		return nil, false
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	flowClients := h.clients[flowID]
	if flowClients == nil {
		flowClients = make(map[uint64]*oauthStreamClient)
		h.clients[flowID] = flowClients
	}

	if len(flowClients) >= oauthStreamMaxClients {
		return nil, false
	}

	client := &oauthStreamClient{
		id: atomic.AddUint64(&h.nextID, 1),
		ch: make(chan OAuthStreamEvent, oauthStreamBufferSize),
	}
	flowClients[client.id] = client

	return client, true
}

func (h *OAuthStreamHub) Remove(flowID string, clientID uint64) {
	h.mu.Lock()
	defer h.mu.Unlock()

	flowClients := h.clients[flowID]
	if flowClients == nil {
		return
	}

	delete(flowClients, clientID)
	if len(flowClients) == 0 {
		delete(h.clients, flowID)
	}
}

func (h *OAuthStreamHub) Publish(flowID string, event OAuthStreamEvent) {
	if !validOAuthFlowID(flowID) || !validOAuthProvider(event.Provider) {
		return
	}

	event.Time = time.Now().UTC().Format(time.RFC3339)

	h.mu.RLock()
	flowClients := h.clients[flowID]
	targets := make([]*oauthStreamClient, 0, len(flowClients))
	for _, client := range flowClients {
		targets = append(targets, client)
	}
	h.mu.RUnlock()

	for _, client := range targets {
		select {
		case client.ch <- event:
		default:
			// Slow clients should not block OAuth handlers.
		}
	}
}

func writeOAuthSSE(w *bufio.Writer, eventName string, data any) error {
	payload, err := json.Marshal(data)
	if err != nil {
		return err
	}

	if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", eventName, payload); err != nil {
		return err
	}

	return w.Flush()
}

func (ctrl *Controller) publishOAuthEvent(routeID string, provider string, phase string, endpoint string) {
	ctrl.oauthStream.Publish(routeID, OAuthStreamEvent{
		Provider: provider,
		Phase:    phase,
		Endpoint: endpoint,
		RouteID:  routeID,
	})
}

func (ctrl *Controller) ListenForOAuth(c *fiber.Ctx) error {
	flowID := c.Params("flowID")
	userData := c.Locals("user").(*utils.UserJWT)

	routeID, err := utils.StrToPgUUID(flowID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid route id",
		})
	}

	userID, err := utils.StrToPgUUID(userData.Id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	if _, err = ctrl.queries.GetOauthClientSecret(c.Context(), db.GetOauthClientSecretParams{
		ID:     routeID,
		UserID: userID,
	}); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "oauth route not found",
		})
	}

	client, ok := ctrl.oauthStream.Add(flowID)
	if !ok {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error": "invalid flow or too many listeners",
		})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer ctrl.oauthStream.Remove(flowID, client.id)

		if _, err := fmt.Fprint(w, "retry: 3000\n\n"); err != nil {
			return
		}
		if err := writeOAuthSSE(w, "oauth", OAuthStreamEvent{
			Provider: "stream",
			Phase:    "connected",
			Endpoint: "/oauth/listen/" + flowID,
			RouteID:  flowID,
			Time:     time.Now().UTC().Format(time.RFC3339),
		}); err != nil {
			return
		}

		heartbeat := time.NewTicker(oauthStreamHeartbeat)
		defer heartbeat.Stop()

		timeout := time.NewTimer(oauthStreamMaxConnection)
		defer timeout.Stop()

		for {
			select {
			case event := <-client.ch:
				if err := writeOAuthSSE(w, "oauth", event); err != nil {
					return
				}
			case <-heartbeat.C:
				if err := writeOAuthSSE(w, "heartbeat", fiber.Map{
					"time": time.Now().UTC().Format(time.RFC3339),
				}); err != nil {
					return
				}
			case <-timeout.C:
				_ = writeOAuthSSE(w, "oauth", OAuthStreamEvent{
					Provider: "stream",
					Phase:    "closed",
					Endpoint: "/oauth/listen/" + flowID,
					RouteID:  flowID,
					Time:     time.Now().UTC().Format(time.RFC3339),
				})
				return
			}
		}
	})

	return nil
}

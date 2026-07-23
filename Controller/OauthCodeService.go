package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	redis "github.com/redis/go-redis/v9"
	utils "reverse-http/Utils"
	db "reverse-http/db/sqlc"
)

const (
	oauthFlowTTL = 5 * time.Minute
	oauthCodeTTL = 60 * time.Second
)

var errOAuthRecordNotFound = errors.New("oauth record was not found")
var newOAuthOpaqueValue = utils.NewRandomURLSafe

type oauthRouteConfig struct {
	ID           string `json:"id"`
	Endpoint     string `json:"endpoint"`
	ClientSecret string `json:"client_secret"`
}

type oauthFlowRecord struct {
	Provider         string    `json:"provider"`
	RouteID          string    `json:"route_id,omitempty"`
	CallbackURL      string    `json:"callback_url,omitempty"`
	ApplicationState string    `json:"application_state,omitempty"`
	CodeChallenge    string    `json:"code_challenge,omitempty"`
	UpstreamVerifier string    `json:"upstream_verifier"`
	IssuedAt         time.Time `json:"issued_at"`
}

type OAuthIdentity struct {
	ProviderName  string  `json:"provider_name"`
	ProviderID    string  `json:"provider_id"`
	Email         *string `json:"email"`
	EmailVerified bool    `json:"email_verified"`
	Username      *string `json:"username"`
	Avatar        *string `json:"avatar"`
}

type oauthCodeRecord struct {
	ApplicationID string        `json:"application_id"`
	RedirectURI   string        `json:"redirect_uri"`
	CodeChallenge string        `json:"code_challenge"`
	Identity      OAuthIdentity `json:"identity"`
	IssuedAt      time.Time     `json:"issued_at"`
}

func oauthRouteFromDB(data db.OauthConfig) oauthRouteConfig {
	return oauthRouteConfig{
		ID:           data.ID.String(),
		Endpoint:     data.Endpoint,
		ClientSecret: data.ClientSecret,
	}
}

func oauthRouteCacheKey(applicationID string) string {
	return "oauth:route:v2:" + applicationID
}

func (ctrl *Controller) loadOAuthRoute(ctx context.Context, routeID string) (oauthRouteConfig, error) {
	id, err := utils.StrToPgUUID(routeID)
	if err != nil {
		return oauthRouteConfig{}, fmt.Errorf("invalid oauth route id")
	}

	canonicalID := id.String()
	redisKey := oauthRouteCacheKey(canonicalID)
	cached, err := ctrl.redisClient.Get(ctx, redisKey).Result()
	if err == nil {
		var route oauthRouteConfig
		if json.Unmarshal([]byte(cached), &route) == nil && route.ID == canonicalID {
			return route, nil
		}
		if err := ctrl.redisClient.Del(ctx, redisKey).Err(); err != nil {
			return oauthRouteConfig{}, fmt.Errorf("oauth route cache unavailable: %w", err)
		}
		err = redis.Nil
	}
	if !errors.Is(err, redis.Nil) {
		return oauthRouteConfig{}, fmt.Errorf("oauth route cache unavailable: %w", err)
	}

	data, err := ctrl.queries.GetOauthConfigData(ctx, id)
	if err != nil {
		return oauthRouteConfig{}, err
	}

	route := oauthRouteFromDB(data)
	encoded, err := json.Marshal(route)
	if err != nil {
		return oauthRouteConfig{}, err
	}
	if err := ctrl.redisClient.Set(ctx, redisKey, encoded, 5*time.Minute).Err(); err != nil {
		return oauthRouteConfig{}, fmt.Errorf("oauth route cache unavailable: %w", err)
	}

	return route, nil
}

func (ctrl *Controller) createOAuthFlow(ctx context.Context, record oauthFlowRecord) (string, error) {
	for attempt := 0; attempt < 3; attempt++ {
		state, err := newOAuthOpaqueValue(32)
		if err != nil {
			return "", err
		}

		record.IssuedAt = time.Now().UTC()
		encoded, err := json.Marshal(record)
		if err != nil {
			return "", err
		}

		key := "oauth:flow:" + utils.OAuthCodeDigest(state)
		created, err := ctrl.redisClient.SetNX(ctx, key, encoded, oauthFlowTTL).Result()
		if err != nil {
			return "", err
		}
		if created {
			return state, nil
		}
	}

	return "", fmt.Errorf("failed to allocate oauth flow")
}

func (ctrl *Controller) consumeOAuthFlow(ctx context.Context, state string) (oauthFlowRecord, error) {
	if state == "" || len(state) > 128 {
		return oauthFlowRecord{}, errOAuthRecordNotFound
	}

	key := "oauth:flow:" + utils.OAuthCodeDigest(state)
	value, err := ctrl.redisClient.GetDel(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return oauthFlowRecord{}, errOAuthRecordNotFound
	}
	if err != nil {
		return oauthFlowRecord{}, err
	}

	var record oauthFlowRecord
	if err := json.Unmarshal([]byte(value), &record); err != nil {
		return oauthFlowRecord{}, errOAuthRecordNotFound
	}
	return record, nil
}

func oauthCodeRedisKey(applicationID string, code string) string {
	return "oauth:code:" + applicationID + ":" + utils.OAuthCodeDigest(code)
}

func (ctrl *Controller) createAuthorizationCode(ctx context.Context, record oauthCodeRecord) (string, error) {
	for attempt := 0; attempt < 3; attempt++ {
		code, err := newOAuthOpaqueValue(32)
		if err != nil {
			return "", err
		}

		record.IssuedAt = time.Now().UTC()
		encoded, err := json.Marshal(record)
		if err != nil {
			return "", err
		}

		created, err := ctrl.redisClient.SetNX(
			ctx,
			oauthCodeRedisKey(record.ApplicationID, code),
			encoded,
			oauthCodeTTL,
		).Result()
		if err != nil {
			return "", err
		}
		if created {
			return code, nil
		}
	}

	return "", fmt.Errorf("failed to allocate oauth authorization code")
}

func parseOAuthCodeRecord(value string) (oauthCodeRecord, error) {
	var record oauthCodeRecord
	if err := json.Unmarshal([]byte(value), &record); err != nil {
		return oauthCodeRecord{}, errOAuthRecordNotFound
	}
	return record, nil
}

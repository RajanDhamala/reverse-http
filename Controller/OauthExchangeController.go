package controller

import (
	"encoding/base64"
	"errors"
	"fmt"
	"mime"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	redis "github.com/redis/go-redis/v9"
	utils "reverse-http/Utils"
)

const (
	exchangeRequestLimit = 4 * 1024
	exchangeRateLimit    = 30
)

type oauthExchangeRequest struct {
	Code         string `json:"code"`
	RedirectURI  string `json:"redirect_uri"`
	CodeVerifier string `json:"code_verifier"`
}

type oauthExchangeError struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

func exchangeError(c *fiber.Ctx, status int, code string) error {
	description := "The OAuth request could not be completed."
	switch code {
	case "invalid_client":
		description = "Client authentication failed."
	case "invalid_grant":
		description = "The authorization code is invalid, expired, or already used."
	case "temporarily_unavailable":
		description = "The OAuth service is temporarily unavailable."
	}

	c.Set(fiber.HeaderCacheControl, "no-store")
	c.Set("Pragma", "no-cache")
	return c.Status(status).JSON(oauthExchangeError{
		Error:            code,
		ErrorDescription: description,
	})
}

func parseBasicClientCredentials(value string) (string, string, bool) {
	scheme, encoded, ok := strings.Cut(value, " ")
	if !ok || !strings.EqualFold(scheme, "Basic") || len(encoded) > 2048 {
		return "", "", false
	}
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", "", false
	}
	clientID, clientSecret, ok := strings.Cut(string(decoded), ":")
	if !ok || clientID == "" || clientSecret == "" {
		return "", "", false
	}
	return clientID, clientSecret, true
}

func validAuthorizationCode(code string) bool {
	if len(code) != 43 {
		return false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(code)
	return err == nil && len(decoded) == 32
}

func (ctrl *Controller) enforceExchangeRateLimit(c *fiber.Ctx, applicationID string) (bool, error) {
	window := time.Now().UTC().Unix() / 60
	sourceDigest := utils.OAuthCodeDigest(c.IP())
	key := fmt.Sprintf("oauth:exchange:rate:%s:%s:%d", applicationID, sourceDigest, window)

	script := redis.NewScript(`
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`)
	count, err := script.Run(c.Context(), ctrl.redisClient, []string{key}, 90).Int64()
	if err != nil {
		return false, err
	}
	return count <= exchangeRateLimit, nil
}

func validateCodeRecord(record oauthCodeRecord, route oauthRouteConfig, request oauthExchangeRequest) bool {
	return record.ApplicationID == route.ID &&
		record.RedirectURI == route.Endpoint &&
		record.RedirectURI == request.RedirectURI &&
		utils.SecureStringEqual(record.CodeChallenge, utils.PKCEChallenge(request.CodeVerifier))
}

func (ctrl *Controller) ExchangeOAuthCode(c *fiber.Ctx) error {
	clientID, clientSecret, ok := parseBasicClientCredentials(c.Get(fiber.HeaderAuthorization))
	if !ok {
		c.Set(fiber.HeaderWWWAuthenticate, `Basic realm="oauth-exchange"`)
		return exchangeError(c, fiber.StatusUnauthorized, "invalid_client")
	}

	route, err := ctrl.loadOAuthRoute(c.Context(), clientID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || strings.Contains(err.Error(), "invalid oauth route id") {
			c.Set(fiber.HeaderWWWAuthenticate, `Basic realm="oauth-exchange"`)
			return exchangeError(c, fiber.StatusUnauthorized, "invalid_client")
		}
		return exchangeError(c, fiber.StatusServiceUnavailable, "temporarily_unavailable")
	}
	if !utils.SecureStringEqual(route.ClientSecret, clientSecret) {
		c.Set(fiber.HeaderWWWAuthenticate, `Basic realm="oauth-exchange"`)
		return exchangeError(c, fiber.StatusUnauthorized, "invalid_client")
	}

	allowed, err := ctrl.enforceExchangeRateLimit(c, route.ID)
	if err != nil {
		ctrl.publishOAuthEvent(route.ID, "exchange", "redis_failure", c.Path())
		return exchangeError(c, fiber.StatusServiceUnavailable, "temporarily_unavailable")
	}
	if !allowed {
		c.Set(fiber.HeaderRetryAfter, "60")
		return exchangeError(c, fiber.StatusTooManyRequests, "temporarily_unavailable")
	}

	mediaType, _, mediaTypeError := mime.ParseMediaType(c.Get(fiber.HeaderContentType))
	if len(c.Body()) == 0 || len(c.Body()) > exchangeRequestLimit ||
		mediaTypeError != nil || mediaType != fiber.MIMEApplicationJSON {
		return exchangeError(c, fiber.StatusBadRequest, "invalid_request")
	}

	var request oauthExchangeRequest
	if err := c.BodyParser(&request); err != nil ||
		!validAuthorizationCode(request.Code) ||
		!utils.ValidPKCEVerifier(request.CodeVerifier) ||
		len(request.RedirectURI) == 0 || len(request.RedirectURI) > 2048 {
		return exchangeError(c, fiber.StatusBadRequest, "invalid_request")
	}
	if request.RedirectURI != route.Endpoint {
		ctrl.publishOAuthEvent(route.ID, "exchange", "invalid_grant", c.Path())
		return exchangeError(c, fiber.StatusBadRequest, "invalid_grant")
	}

	key := oauthCodeRedisKey(route.ID, request.Code)
	storedValue, err := ctrl.redisClient.Get(c.Context(), key).Result()
	if errors.Is(err, redis.Nil) {
		ctrl.publishOAuthEvent(route.ID, "exchange", "invalid_grant", c.Path())
		return exchangeError(c, fiber.StatusBadRequest, "invalid_grant")
	}
	if err != nil {
		ctrl.publishOAuthEvent(route.ID, "exchange", "redis_failure", c.Path())
		return exchangeError(c, fiber.StatusServiceUnavailable, "temporarily_unavailable")
	}

	storedRecord, err := parseOAuthCodeRecord(storedValue)
	if err != nil || !validateCodeRecord(storedRecord, route, request) {
		ctrl.publishOAuthEvent(route.ID, "exchange", "invalid_grant", c.Path())
		return exchangeError(c, fiber.StatusBadRequest, "invalid_grant")
	}

	consumedValue, err := ctrl.redisClient.GetDel(c.Context(), key).Result()
	if errors.Is(err, redis.Nil) {
		ctrl.publishOAuthEvent(route.ID, "exchange", "invalid_grant", c.Path())
		return exchangeError(c, fiber.StatusBadRequest, "invalid_grant")
	}
	if err != nil {
		ctrl.publishOAuthEvent(route.ID, "exchange", "redis_failure", c.Path())
		return exchangeError(c, fiber.StatusServiceUnavailable, "temporarily_unavailable")
	}
	if !utils.SecureStringEqual(storedValue, consumedValue) {
		return exchangeError(c, fiber.StatusBadRequest, "invalid_grant")
	}

	consumedRecord, err := parseOAuthCodeRecord(consumedValue)
	if err != nil || !validateCodeRecord(consumedRecord, route, request) {
		return exchangeError(c, fiber.StatusBadRequest, "invalid_grant")
	}

	c.Set(fiber.HeaderCacheControl, "no-store")
	c.Set("Pragma", "no-cache")
	ctrl.publishOAuthEvent(route.ID, "exchange", "exchange_success", c.Path())
	return c.Status(fiber.StatusOK).JSON(consumedRecord.Identity)
}

package utils

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

const (
	developmentAccessTokenSecret  = "access-key"
	developmentRefreshTokenSecret = "refresh-key"
	minimumTokenSecretBytes       = 32
)

func envBool(name string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(name)))
	if value == "" {
		return fallback
	}

	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func normalizeBaseURL(value string) string {
	return strings.TrimRight(strings.TrimSpace(value), "/")
}

func FrontendBaseURL() string {
	baseURL := normalizeBaseURL(os.Getenv("FRONTEND_URL"))
	if baseURL == "" {
		return "http://localhost:5173"
	}
	return baseURL
}

func BackendBaseURL() string {
	baseURL := normalizeBaseURL(os.Getenv("BACKEND_URL"))
	if baseURL == "" {
		return "http://localhost:3000"
	}
	return baseURL
}

func FrontendURL(path string) string {
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return FrontendBaseURL() + path
}

func BackendURL(path string) string {
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return BackendBaseURL() + path
}

func CookieSecure() bool {
	return envBool("COOKIE_SECURE", strings.EqualFold(os.Getenv("APP_ENV"), "production"))
}

func CookieSameSite() string {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("COOKIE_SAMESITE")))
	if value == "" {
		if CookieSecure() {
			return "none"
		}
		return "lax"
	}

	switch value {
	case "strict", "none", "disabled":
		return value
	default:
		return "lax"
	}
}

func CookieDomain() string {
	return strings.TrimSpace(os.Getenv("COOKIE_DOMAIN"))
}

func tokenSecret(name string, developmentFallback string) []byte {
	value := os.Getenv(name)
	if value == "" {
		value = developmentFallback
	}
	return []byte(value)
}

func accessTokenSecret() []byte {
	return tokenSecret("ACCESS_TOKEN_SECRET", developmentAccessTokenSecret)
}

func refreshTokenSecret() []byte {
	return tokenSecret("REFRESH_TOKEN_SECRET", developmentRefreshTokenSecret)
}

func ValidateProductionOAuthEnvironment() error {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production") {
		return nil
	}
	backendURL, err := url.Parse(BackendBaseURL())
	if err != nil || backendURL.Scheme != "https" || backendURL.Host == "" {
		return fmt.Errorf("BACKEND_URL must be an absolute HTTPS URL in production")
	}

	accessSecret := os.Getenv("ACCESS_TOKEN_SECRET")
	if len([]byte(accessSecret)) < minimumTokenSecretBytes {
		return fmt.Errorf("ACCESS_TOKEN_SECRET must contain at least %d bytes in production", minimumTokenSecretBytes)
	}

	refreshSecret := os.Getenv("REFRESH_TOKEN_SECRET")
	if len([]byte(refreshSecret)) < minimumTokenSecretBytes {
		return fmt.Errorf("REFRESH_TOKEN_SECRET must contain at least %d bytes in production", minimumTokenSecretBytes)
	}

	if accessSecret == refreshSecret {
		return fmt.Errorf("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different in production")
	}

	return nil
}

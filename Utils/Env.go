package utils

import (
	"os"
	"strings"
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

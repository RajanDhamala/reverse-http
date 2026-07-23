package controller

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/oauth2"
	utils "reverse-http/Utils"
)

type githubIdentityResponse struct {
	ID        json.Number `json:"id"`
	Login     string      `json:"login"`
	Name      string      `json:"name"`
	Email     string      `json:"email"`
	AvatarURL string      `json:"avatar_url"`
}

type githubEmailResponse struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func validS256Challenge(value string) bool {
	if len(value) != 43 {
		return false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(value)
	return err == nil && len(decoded) == 32
}

func validApplicationState(value string) bool {
	return len(value) >= 16 && len(value) <= 512
}

func validOAuthCallbackURL(value string) bool {
	if value == "" || len(value) > 2048 {
		return false
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" || parsed.User != nil || parsed.Fragment != "" {
		return false
	}
	return parsed.Scheme == "https" || parsed.Scheme == "http"
}

func optionalIdentityValue(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func identityValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (ctrl *Controller) BeginGoogleOAuth(c *fiber.Ctx) error {
	return ctrl.beginOAuth(c, "google", utils.GoogleConfig())
}

func (ctrl *Controller) BeginGithubOAuth(c *fiber.Ctx) error {
	return ctrl.beginOAuth(c, "github", utils.GithubConfig())
}

func (ctrl *Controller) beginOAuth(c *fiber.Ctx, provider string, providerConfig oauth2.Config) error {
	routeID := strings.TrimSpace(c.Query("client_id"))
	ctrl.publishOAuthEvent(routeID, provider, "login_hit", c.Path())

	flow := oauthFlowRecord{Provider: provider}

	if routeID != "" {
		route, err := ctrl.loadOAuthRoute(c.Context(), routeID)
		if err != nil {
			ctrl.publishOAuthEvent(routeID, provider, "failed", c.Path())
			return redirectWithError(c, "Invalid OAuth route")
		}

		flow.RouteID = route.ID
		flow.CallbackURL = route.Endpoint
		flow.ApplicationState = c.Query("state")
		flow.CodeChallenge = c.Query("code_challenge")
		if !validOAuthCallbackURL(route.Endpoint) ||
			!validApplicationState(flow.ApplicationState) ||
			c.Query("code_challenge_method") != "S256" ||
			!validS256Challenge(flow.CodeChallenge) {
			ctrl.publishOAuthEvent(routeID, provider, "failed", c.Path())
			return redirectWithError(c, "Invalid authorization request")
		}
	}

	flow.UpstreamVerifier = oauth2.GenerateVerifier()
	state, err := ctrl.createOAuthFlow(c.Context(), flow)
	if err != nil {
		ctrl.publishOAuthEvent(routeID, provider, "redis_failure", c.Path())
		return redirectWithError(c, "OAuth is temporarily unavailable")
	}

	authorizationURL := providerConfig.AuthCodeURL(
		state,
		oauth2.S256ChallengeOption(flow.UpstreamVerifier),
	)
	c.Set(fiber.HeaderCacheControl, "no-store")
	c.Set("Pragma", "no-cache")
	c.Set("Referrer-Policy", "no-referrer")
	ctrl.publishOAuthEvent(routeID, provider, "redirect_provider", c.Path())
	return c.Redirect(authorizationURL, fiber.StatusSeeOther)
}

func (ctrl *Controller) CompleteGoogleOAuth(c *fiber.Ctx) error {
	return ctrl.completeOAuthProvider(c, "google", utils.GoogleConfig(), ctrl.fetchGoogleIdentity)
}

func (ctrl *Controller) CompleteGithubOAuth(c *fiber.Ctx) error {
	return ctrl.completeOAuthProvider(c, "github", utils.GithubConfig(), ctrl.fetchGithubIdentity)
}

func (ctrl *Controller) completeOAuthProvider(
	c *fiber.Ctx,
	provider string,
	providerConfig oauth2.Config,
	fetchIdentity func(context.Context, string) (OAuthIdentity, error),
) error {
	flow, err := ctrl.consumeOAuthFlow(c.Context(), c.Query("state"))
	if err != nil || flow.Provider != provider {
		return redirectWithError(c, "Invalid or expired OAuth state")
	}

	c.Locals("oauth_route_id", flow.RouteID)
	ctrl.publishOAuthEvent(flow.RouteID, provider, "callback_hit", c.Path())

	if providerError := c.Query("error"); providerError != "" {
		ctrl.publishOAuthEvent(flow.RouteID, provider, "failed", c.Path())
		if providerError == "access_denied" {
			return ctrl.redirectApplicationOAuthError(c, flow, "access_denied")
		}
		return ctrl.redirectApplicationOAuthError(c, flow, "server_error")
	}

	code := c.Query("code")
	if code == "" || len(code) > 2048 {
		ctrl.publishOAuthEvent(flow.RouteID, provider, "failed", c.Path())
		return ctrl.redirectApplicationOAuthError(c, flow, "invalid_request")
	}

	requestContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	upstreamToken, err := providerConfig.Exchange(
		requestContext,
		code,
		oauth2.VerifierOption(flow.UpstreamVerifier),
	)
	if err != nil {
		ctrl.publishOAuthEvent(flow.RouteID, provider, "failed", c.Path())
		return ctrl.redirectApplicationOAuthError(c, flow, "server_error")
	}

	identity, err := fetchIdentity(requestContext, upstreamToken.AccessToken)
	if err != nil || identity.ProviderID == "" {
		ctrl.publishOAuthEvent(flow.RouteID, provider, "failed", c.Path())
		return ctrl.redirectApplicationOAuthError(c, flow, "server_error")
	}

	return ctrl.finishOAuthFlow(c, flow, identity)
}

func (ctrl *Controller) fetchGoogleIdentity(ctx context.Context, accessToken string) (OAuthIdentity, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return OAuthIdentity{}, err
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return OAuthIdentity{}, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return OAuthIdentity{}, fmt.Errorf("google userinfo returned status %d", response.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return OAuthIdentity{}, err
	}
	var profile GoogleUser
	if err := json.Unmarshal(body, &profile); err != nil {
		return OAuthIdentity{}, err
	}

	return OAuthIdentity{
		ProviderName:  "google",
		ProviderID:    profile.ID,
		Email:         optionalIdentityValue(profile.Email),
		EmailVerified: profile.VerifiedEmail,
		Username:      optionalIdentityValue(profile.Name),
		Avatar:        optionalIdentityValue(profile.Picture),
	}, nil
}

func (ctrl *Controller) fetchGithubIdentity(ctx context.Context, accessToken string) (OAuthIdentity, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return OAuthIdentity{}, err
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("User-Agent", "reverse-http")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return OAuthIdentity{}, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return OAuthIdentity{}, fmt.Errorf("github userinfo returned status %d", response.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return OAuthIdentity{}, err
	}
	var profile githubIdentityResponse
	if err := json.Unmarshal(body, &profile); err != nil {
		return OAuthIdentity{}, err
	}

	email := strings.TrimSpace(profile.Email)
	emailVerified := false
	emails, emailErr := ctrl.fetchGithubEmails(ctx, accessToken)
	if emailErr == nil {
		for _, candidate := range emails {
			if candidate.Primary && candidate.Verified {
				email = candidate.Email
				emailVerified = true
				break
			}
		}
	}

	username := profile.Name
	if strings.TrimSpace(username) == "" {
		username = profile.Login
	}

	return OAuthIdentity{
		ProviderName:  "github",
		ProviderID:    profile.ID.String(),
		Email:         optionalIdentityValue(email),
		EmailVerified: emailVerified,
		Username:      optionalIdentityValue(username),
		Avatar:        optionalIdentityValue(profile.AvatarURL),
	}, nil
}

func (ctrl *Controller) fetchGithubEmails(ctx context.Context, accessToken string) ([]githubEmailResponse, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user/emails", nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("User-Agent", "reverse-http")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("github emails returned status %d", response.StatusCode)
	}

	var emails []githubEmailResponse
	decoder := json.NewDecoder(io.LimitReader(response.Body, 1<<20))
	if err := decoder.Decode(&emails); err != nil {
		return nil, err
	}
	return emails, nil
}

func (ctrl *Controller) finishOAuthFlow(c *fiber.Ctx, flow oauthFlowRecord, identity OAuthIdentity) error {
	if flow.RouteID != "" {
		route, err := ctrl.loadOAuthRoute(c.Context(), flow.RouteID)
		if err != nil || route.ID != flow.RouteID || route.Endpoint != flow.CallbackURL {
			return ctrl.redirectApplicationOAuthError(c, flow, "invalid_request")
		}

		code, err := ctrl.createAuthorizationCode(c.Context(), oauthCodeRecord{
			ApplicationID: route.ID,
			RedirectURI:   route.Endpoint,
			CodeChallenge: flow.CodeChallenge,
			Identity:      identity,
		})
		if err != nil {
			ctrl.publishOAuthEvent(flow.RouteID, flow.Provider, "redis_failure", c.Path())
			return ctrl.redirectApplicationOAuthError(c, flow, "temporarily_unavailable")
		}

		callback, err := url.Parse(route.Endpoint)
		if err != nil {
			return redirectWithError(c, "Invalid callback endpoint")
		}
		query := callback.Query()
		query.Set("code", code)
		query.Set("state", flow.ApplicationState)
		callback.RawQuery = query.Encode()

		c.Set(fiber.HeaderCacheControl, "no-store")
		c.Set("Pragma", "no-cache")
		c.Set("Referrer-Policy", "no-referrer")
		ctrl.publishOAuthEvent(flow.RouteID, flow.Provider, "code_issued", c.Path())
		return c.Redirect(callback.String(), fiber.StatusSeeOther)
	}

	if identity.Email == nil {
		return redirectWithError(c, "OAuth provider did not return an email address")
	}
	oauthData := OAuthUserData{
		Provider:      identity.ProviderName,
		ProviderId:    identity.ProviderID,
		Email:         *identity.Email,
		EmailVerified: identity.EmailVerified,
		FullName:      identityValue(identity.Username),
		AvatarURL:     identityValue(identity.Avatar),
	}
	jwtPayload, err := ctrl.OauthLogin(&oauthData, c)
	if err != nil {
		return redirectWithError(c, err.Error())
	}

	accessToken, err := utils.CreateAccessToken(jwtPayload)
	if err != nil {
		return redirectWithError(c, "Failed to create access token")
	}
	refreshToken, err := utils.CreateRefreshToken(jwtPayload)
	if err != nil {
		return redirectWithError(c, "Failed to create refresh token")
	}

	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    accessToken,
		HTTPOnly: true,
		Path:     "/",
		Secure:   utils.CookieSecure(),
		SameSite: utils.CookieSameSite(),
		Domain:   utils.CookieDomain(),
		Expires:  time.Now().Add(15 * time.Minute),
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    refreshToken,
		HTTPOnly: true,
		Path:     "/",
		Secure:   utils.CookieSecure(),
		SameSite: utils.CookieSameSite(),
		Domain:   utils.CookieDomain(),
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})

	ctrl.publishOAuthEvent("", flow.Provider, "success", c.Path())
	return c.Redirect(utils.FrontendURL("/"), fiber.StatusSeeOther)
}

func (ctrl *Controller) redirectApplicationOAuthError(c *fiber.Ctx, flow oauthFlowRecord, errorCode string) error {
	if flow.RouteID == "" || flow.CallbackURL == "" {
		return redirectWithError(c, "OAuth authentication failed")
	}

	callback, err := url.Parse(flow.CallbackURL)
	if err != nil {
		return redirectWithError(c, "OAuth authentication failed")
	}
	query := callback.Query()
	query.Set("error", errorCode)
	query.Set("state", flow.ApplicationState)
	callback.RawQuery = query.Encode()

	c.Set(fiber.HeaderCacheControl, "no-store")
	c.Set("Pragma", "no-cache")
	c.Set("Referrer-Policy", "no-referrer")
	return c.Redirect(callback.String(), fiber.StatusSeeOther)
}

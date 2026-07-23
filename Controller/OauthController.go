package controller

import (
	"fmt"
	"html"
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	utils "reverse-http/Utils"
)

type OAuthUserData struct {
	Id            uuid.UUID `json:"id"`
	Provider      string    `json:"provider"`
	ProviderId    string    `json:"provider_id"`
	Email         string    `json:"email"`
	EmailVerified bool      `json:"email_verified"`
	FullName      string    `json:"full_name"`
	AvatarURL     string    `json:"avatar_url"`
}

type GitHubUser struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

type GoogleUser struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	VerifiedEmail bool   `json:"verified_email"`
}

func redirectWithError(c *fiber.Ctx, errMsg string) error {
	provider := "oauth"
	path := strings.ToLower(c.Path())
	if strings.Contains(path, "github") {
		provider = "github"
	} else if strings.Contains(path, "google") {
		provider = "google"
	}

	values := url.Values{}
	values.Set("message", errMsg)
	values.Set("provider", provider)
	values.Set("return_url", frontendURL("/oauth"))
	values.Set("docs_url", frontendURL("/docs"))
	routeID, _ := c.Locals("oauth_route_id").(string)
	if routeID == "" {
		routeID = c.Query("client_id")
	}
	if routeID != "" {
		values.Set("route_id", routeID)
	}

	return c.Redirect("/oauth/error?"+values.Encode(), fiber.StatusSeeOther)
}

func frontendURL(path string) string {
	return utils.FrontendURL(path)
}

func safePageURL(value string, fallback string) string {
	if value == "" {
		return fallback
	}
	if strings.HasPrefix(value, "/") && !strings.HasPrefix(value, "//") {
		return value
	}
	parsed, err := url.Parse(value)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return fallback
	}
	return value
}

func (ctrl *Controller) OAuthErrorPage(c *fiber.Ctx) error {
	message := c.Query("message", "OAuth authentication failed")
	provider := c.Query("provider", "oauth")
	routeID := c.Query("route_id", "")
	docsURL := safePageURL(c.Query("docs_url"), frontendURL("/docs"))
	routesURL := safePageURL(c.Query("return_url"), frontendURL("/oauth"))

	if routeID == "" {
		routeID = "not provided"
	}

	page := fmt.Sprintf(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OAuth Error - Reverse HTTP</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f3f4f6;
      --grid: rgba(229, 231, 235, 0.86);
      --text: #111827;
      --muted: #5f6b7a;
      --border: #d1d5db;
      --cyan: #06b6d4;
      --cyan-dark: #0e7490;
      --rose: #e11d48;
      --rose-bg: #fff1f2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background-color: var(--bg);
      background-image:
        linear-gradient(var(--grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid) 1px, transparent 1px);
      background-size: 20px 20px;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .shell {
      width: min(860px, 100%%);
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(#f9fafb, #eef1f5);
      padding: 12px 16px;
    }
    .dots { display: flex; gap: 6px; }
    .dot { width: 12px; height: 12px; border-radius: 999px; }
    .address {
      min-width: 0;
      flex: 1;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      background: #fff;
      padding: 8px 12px;
      color: #6b7280;
      font: 12px/1.2 "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .content {
      display: grid;
      gap: 24px;
      padding: 28px;
    }
    .pill {
      display: inline-flex;
      width: max-content;
      align-items: center;
      gap: 8px;
      border: 1px solid #fecdd3;
      border-radius: 999px;
      background: var(--rose-bg);
      color: #be123c;
      padding: 6px 10px;
      font: 700 11px/1 "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
      text-transform: uppercase;
    }
    h1 {
      max-width: 680px;
      margin: 18px 0 0;
      font-size: clamp(34px, 7vw, 64px);
      line-height: 0.98;
      letter-spacing: 0;
    }
    .copy {
      max-width: 680px;
      margin: 16px 0 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.7;
    }
    .panel {
      display: grid;
      gap: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #f9fafb;
      padding: 16px;
    }
    .row {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      font: 12px/1.5 "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
    }
    .label { color: #8b95a1; text-transform: uppercase; }
    .value { min-width: 0; overflow-wrap: anywhere; color: #334155; }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }
    .button {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      color: #374151;
      padding: 0 14px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
    }
    .button.primary {
      border-color: var(--cyan);
      background: var(--cyan);
      color: #fff;
    }
    @media (max-width: 560px) {
      body { padding: 12px; place-items: start center; }
      .content { padding: 20px; }
      .row { grid-template-columns: 1fr; gap: 3px; }
      .button { width: 100%%; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="bar">
      <div class="dots" aria-hidden="true">
        <span class="dot" style="background:#ff5f57"></span>
        <span class="dot" style="background:#febc2e"></span>
        <span class="dot" style="background:#28c840"></span>
      </div>
      <div class="address">reverse-http.local/oauth/error</div>
    </div>
    <section class="content">
      <div>
        <span class="pill">OAuth error</span>
        <h1>Authentication could not continue.</h1>
        <p class="copy">Reverse HTTP stopped this OAuth flow because the backend could not complete a required step. Check the route id, provider callback, client secret, and registered callback URL before trying again.</p>
      </div>
      <div class="panel" aria-label="OAuth error details">
        <div class="row">
          <span class="label">Provider</span>
          <span class="value">%s</span>
        </div>
        <div class="row">
          <span class="label">Route id</span>
          <span class="value">%s</span>
        </div>
        <div class="row">
          <span class="label">Message</span>
          <span class="value">%s</span>
        </div>
      </div>
      <div class="actions">
        <a class="button primary" href="%s">Open OAuth routes</a>
        <a class="button" href="%s">Read docs</a>
      </div>
    </section>
  </main>
</body>
</html>`,
		html.EscapeString(provider),
		html.EscapeString(routeID),
		html.EscapeString(message),
		html.EscapeString(routesURL),
		html.EscapeString(docsURL),
	)

	c.Set(fiber.HeaderContentType, fiber.MIMETextHTMLCharsetUTF8)
	return c.Status(fiber.StatusBadRequest).SendString(page)
}

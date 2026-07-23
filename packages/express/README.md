# @reverse-http/express

Express middleware for Reverse HTTP's PKCE-protected, one-time OAuth code exchange.

```ts
import { createReverseHttpOAuth } from "@reverse-http/express";

const oauth = createReverseHttpOAuth({
  providerUrl: process.env.REVERSE_HTTP_PROVIDER_URL!,
  clientId: process.env.REVERSE_HTTP_CLIENT_ID!,
  clientSecret: process.env.REVERSE_HTTP_CLIENT_SECRET!,
  callbackUrl: "https://api.example.com/oauth/callback",
  stateCookieSecret: process.env.OAUTH_STATE_COOKIE_SECRET!,
});

app.get("/oauth/start/:provider", oauth.start());
app.get("/oauth/callback", oauth.callback({
  onAuthenticated: async ({ identity, res }) => {
    // Create the application's user and session here.
    res.redirect("https://app.example.com");
  },
}));
```

The package never creates application sessions or exposes the client secret to the browser.

Register `callbackUrl` exactly on the OAuth route. Callback URLs may use HTTP or HTTPS; HTTP callbacks receive a non-`Secure` temporary state cookie. The hosted `providerUrl` must use HTTPS, except for explicitly enabled local development. Both secrets must contain at least 32 bytes, and `stateCookieSecret` must be separate application configuration.

An `invalid_grant` means the code was missing, expired, or already consumed. Restart the OAuth start route; do not retry the same callback code.

Configure application access logs to redact the callback query string, even though the code is short-lived and single use.

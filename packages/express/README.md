# @reverse-http/express

Express middleware for Reverse HTTP's PKCE-protected, one-time OAuth exchange.

## Installation

```bash
npm install @reverse-http/express
```

## Usage

```ts
import express from "express";
import { createReverseHttpOAuth } from "@reverse-http/express";

const app = express();

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
    await applicationSessions.create(identity);
    res.redirect("https://app.example.com");
  },
}));
```

The package manages OAuth state, PKCE, the temporary state cookie, callback validation, and server-to-server code exchange. Application users and sessions remain owned by the consuming service.

## Configuration

- `providerUrl` is the public Reverse HTTP API base.
- `clientId` and `clientSecret` identify the registered OAuth route.
- `callbackUrl` must exactly match the route registration.
- `stateCookieSecret` signs the temporary OAuth transaction cookie.
- `allowedProviders` can restrict the default Google and GitHub provider set.
- `allowInsecureDevelopment` permits a local HTTP provider during development.

Client and cookie secrets must each contain at least 32 bytes. HTTP callback URLs use a non-`Secure` temporary cookie; HTTPS is appropriate whenever traffic leaves a trusted network.

## Errors

Callback failures use `ReverseHttpOAuthError` with stable codes such as `invalid_state`, `invalid_grant`, `provider_unavailable`, and `invalid_response`. An expired or consumed code starts a new OAuth flow rather than reusing the callback request.

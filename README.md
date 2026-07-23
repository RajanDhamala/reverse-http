
# Reverse HTTP Config Service

A lightweight **Go-based reverse HTTP server** that acts as a **reverse proxy for OAuth** and provides basic **app configuration** to clients when the app starts.

## Purpose

- Serve basic configuration to apps on startup
- Host Google and GitHub OAuth for registered applications
- Hand applications a short-lived opaque code that their backend exchanges once

## OAuth handoff

Every registered route uses PKCE (`S256`) plus confidential client authentication. The browser callback contains only `code` and application `state`; the registered backend sends the code, exact callback URI, and verifier to `POST /oauth/exchange`. Redis stores only a SHA-256 code digest for 60 seconds and atomically consumes it with `GETDEL`.

Registered application callbacks may use either HTTP or HTTPS. The hosted provider and server-to-server exchange must use HTTPS in production because application credentials cross that connection.

The Express, React, and Python SDKs accept HTTP callback backends. Prefer HTTPS outside trusted networks so the callback and temporary state cookie are encrypted in transit.

SDKs live in [`packages/express`](packages/express), [`packages/react`](packages/react), and [`packages/python`](packages/python). The backend SDKs validate state, exchange the code, and return a normalized identity; the consuming application still owns its users and sessions.

Apply migrations through [`00003_clean_oauth_code_rollout.sql`](db/migrations/00003_clean_oauth_code_rollout.sql) before deploying this version. Migration `00003` intentionally clears existing OAuth route registrations, removes the obsolete handoff-mode column, and requires client secrets of at least 32 bytes. Route owners must recreate their OAuth routes after the clean rollout.

## Production environment

Copy [`.env.example`](.env.example) into your deployment environment and replace every placeholder. Production startup requires `BACKEND_URL` to use HTTPS and requires different `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` values of at least 32 bytes each. Generate each signing secret independently, for example with `openssl rand -base64 48`.

The OAuth client secret stored for each registered route is separate from these JWT signing secrets. It must also contain at least 32 bytes and is created when the route is registered.

The UI is deployed separately. Configure its two public build-time values from [`ui/.env.example`](ui/.env.example).

## Tech Stack

- **Go 1.25**
- [Fiber v2](https://github.com/gofiber/fiber)
- Docker (multi-stage build)
- Alpine Linux base for lightweight production images

# Reverse HTTP

Reverse HTTP is a Go service for application configuration and secure OAuth handoff. It hosts Google and GitHub authentication for registered applications, then returns a short-lived code that the application backend exchanges exactly once.

## Features

- Application configuration endpoints for web and mobile clients
- Registered Google and GitHub OAuth routes
- PKCE (`S256`) with confidential client authentication
- Opaque authorization codes with a 60-second lifetime
- Express, React, and Python consumer SDKs
- Web management interface and live OAuth route monitoring

## OAuth flow

1. The application backend creates state and a PKCE verifier.
2. The browser is redirected to the registered Reverse HTTP OAuth route.
3. Reverse HTTP completes provider authentication and redirects with `code` and `state` only.
4. The application backend exchanges the code at `POST /oauth/exchange`.
5. Reverse HTTP validates the route, callback URI, PKCE verifier, and client credentials before returning a normalized identity.

Redis stores only a SHA-256 digest of each code and consumes it atomically with `GETDEL`. Provider tokens, client secrets, and user profiles are never placed in the browser callback.

## SDKs

| Package | Role |
| --- | --- |
| [`@reverse-http/express`](packages/express) | Express middleware for state, PKCE, callback validation, and code exchange |
| [`@reverse-http/react`](packages/react) | Style-neutral browser navigation to an application backend |
| [`reverse-http-oauth`](packages/python) | Framework-independent Python client with Flask and FastAPI adapters |

The consuming application remains responsible for its own users, sessions, and authorization rules.

## Repository structure

| Path | Contents |
| --- | --- |
| `Controller/`, `Route/`, `Middleware/` | Go API and OAuth request handling |
| `Utils/`, `Configs/`, `Models/` | Security, storage, and shared server code |
| `db/` | PostgreSQL migrations, queries, and generated SQL access |
| `ui/` | React management interface |
| `packages/` | Express, React, and Python SDKs |
| `examples/` | Standalone SDK integration examples |
| `media/` | Editable product-video sources, timing, audio stems, and rebuild workflow |

## Development

Go server:

```bash
go run .
```

SDK workspace:

```bash
npm ci
npm run typecheck:sdk
npm run test:sdk
npm run build:sdk
```

Web interface:

```bash
npm ci --prefix ui
npm run dev --prefix ui
```

Database changes are versioned in [`db/migrations`](db/migrations). Migration `00003_clean_oauth_code_rollout.sql` removes the legacy handoff mode and clears existing OAuth route registrations as part of the one-time-code rollout.

## Stack

- Go 1.25 and Fiber v2
- PostgreSQL and Redis
- React 19, TypeScript, Vite, and Tailwind CSS
- Vitest and Go test
- Docker

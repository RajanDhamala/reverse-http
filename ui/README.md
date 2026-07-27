# Reverse HTTP Web Interface

The React management interface for Reverse HTTP. It provides account access, application configuration management, OAuth route registration, package documentation, and live OAuth route monitoring.

## Stack

- React 19 and TypeScript
- Vite 7
- Tailwind CSS 4
- TanStack Query and Zustand
- React Router
- ESLint

## Development

Commands run from the `ui` directory:

```bash
npm ci
npm run dev
```

Production validation:

```bash
npm run lint
npm run build
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Backend API base path or absolute URL |
| `VITE_FRONTEND_BASE_URL` | Browser origin | Public web application base URL |

URL normalization and public API links are centralized in `src/Utils/env.ts`.

## Main areas

- Landing page and package documentation
- Email and provider authentication
- Startup configuration records
- OAuth route creation and credential rotation
- Live per-route OAuth event stream

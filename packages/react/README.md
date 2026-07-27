# @reverse-http/react

A style-neutral React navigation helper for Reverse HTTP OAuth. It sends the browser to the consuming application's backend and never receives a client secret, callback code, or identity response.

## Installation

```bash
npm install @reverse-http/react
```

## Usage

```tsx
import { OAuthButton } from "@reverse-http/react";

<OAuthButton provider="google" backendUrl="https://api.example.com">
  Continue with Google
</OAuthButton>
```

`OAuthButton` renders a regular button without package styling, so the application controls its appearance. `buildOAuthStartUrl` is available when navigation is handled by another component.

The default backend route is `/oauth/start/:provider`. Both HTTP and HTTPS backend URLs are supported, with HTTPS appropriate whenever traffic leaves a trusted network.

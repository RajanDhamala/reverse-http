# @reverse-http/react

A thin, style-neutral navigation helper. It sends the browser to your application backend; it never receives a client secret, callback code, or identity response.

```tsx
import { OAuthButton } from "@reverse-http/react";

<OAuthButton provider="google" backendUrl="https://api.example.com">
  Continue with Google
</OAuthButton>
```

Application backends may use either HTTP or HTTPS callback routes. HTTPS is strongly recommended whenever the backend is reachable outside a trusted network.

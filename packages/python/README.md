# reverse-http-oauth

Python 3.10+ support for Reverse HTTP's PKCE-protected, one-time OAuth exchange. The core client is framework independent, with adapters for Flask and FastAPI.

## Installation

```bash
pip install "reverse-http-oauth[flask]"
```

FastAPI applications can use the `fastapi` extra instead.

## Flask usage

```python
import os

from flask import Flask
from reverse_http_oauth import ReverseHttpOAuth
from reverse_http_oauth.flask import FlaskReverseHttpOAuth

app = Flask(__name__)
oauth = FlaskReverseHttpOAuth(ReverseHttpOAuth(
    provider_url=os.environ["REVERSE_HTTP_PROVIDER_URL"],
    client_id=os.environ["REVERSE_HTTP_CLIENT_ID"],
    client_secret=os.environ["REVERSE_HTTP_CLIENT_SECRET"],
    callback_url="https://api.example.com/oauth/callback",
    state_cookie_secret=os.environ["OAUTH_STATE_COOKIE_SECRET"],
))

@app.get("/oauth/start/<provider>")
def oauth_start(provider: str):
    return oauth.start(provider)

@app.get("/oauth/callback")
def oauth_callback():
    return oauth.callback(complete_application_login)
```

`FastAPIReverseHttpOAuth` provides the same flow for FastAPI applications. Both adapters return a typed identity and leave user and session storage to the consuming application.

## Configuration

- `provider_url` is the public Reverse HTTP API base.
- `client_id` and `client_secret` identify the registered OAuth route.
- `callback_url` must exactly match the route registration.
- `state_cookie_secret` signs the temporary OAuth transaction cookie.
- `allowed_providers` can restrict the default Google and GitHub provider set.
- `allow_insecure_development` permits a local HTTP provider during development.

Client and cookie secrets must each contain at least 32 bytes. HTTP callback URLs use a non-`Secure` temporary cookie; HTTPS is appropriate whenever traffic leaves a trusted network.

An expired or consumed authorization code produces `invalid_grant` and starts a new OAuth flow.

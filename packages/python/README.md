# reverse-http-oauth

Python 3.10+ support for Reverse HTTP's PKCE-protected, one-time OAuth code exchange. The core client is framework independent; small Flask and FastAPI adapters manage the temporary OAuth cookie.

```python
import os

from reverse_http_oauth import ReverseHttpOAuth
from reverse_http_oauth.flask import FlaskReverseHttpOAuth

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
    return oauth.callback(
        lambda identity, request: create_session_and_redirect(identity),
    )
```

For FastAPI, import `FastAPIReverseHttpOAuth` from `reverse_http_oauth.fastapi`. Both adapters pass a typed identity to the application and never create or choose an application session.

Register `callback_url` exactly on the OAuth route. Callback URLs may use HTTP or HTTPS; HTTP callbacks receive a non-`Secure` temporary state cookie. The hosted `provider_url` must use HTTPS, except for explicitly enabled local development. Both secrets must contain at least 32 bytes. If a callback raises `invalid_grant`, restart OAuth instead of retrying the consumed or expired code.

Configure application access logs to redact the callback query string, even though the code is short-lived and single use.

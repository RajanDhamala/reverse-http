from __future__ import annotations

import asyncio
import json
from urllib.parse import parse_qs, urlencode, urlsplit

import httpx
from flask import Flask
from fastapi import Request

from reverse_http_oauth import ReverseHttpOAuth
from reverse_http_oauth.fastapi import FastAPIReverseHttpOAuth
from reverse_http_oauth.flask import FlaskReverseHttpOAuth


IDENTITY = {
    "provider_name": "google",
    "provider_id": "109876543210987654321",
    "email": "user@example.com",
    "email_verified": True,
    "username": "Rajan",
    "avatar": None,
}
CODE = "A" * 43


def build_core(handler=None) -> ReverseHttpOAuth:
    transport = httpx.MockTransport(handler) if handler else None
    return ReverseHttpOAuth(
        provider_url="https://auth.example.test",
        client_id="application-id",
        client_secret="client-secret-that-is-at-least-32-bytes",
        callback_url="https://api.example.test/oauth/callback",
        state_cookie_secret="cookie-secret-that-is-at-least-32-bytes",
        transport=transport,
        async_transport=transport,
    )


def test_flask_start_sets_secure_temporary_cookie() -> None:
    app = Flask(__name__)
    adapter = FlaskReverseHttpOAuth(build_core())
    with app.test_request_context():
        response = adapter.start("google")

    cookie = response.headers["Set-Cookie"]
    assert response.status_code == 303
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=Lax" in cookie
    assert "client-secret" not in response.headers["Location"]


def test_fastapi_start_sets_secure_temporary_cookie() -> None:
    response = FastAPIReverseHttpOAuth(build_core()).start("github")

    cookie = response.headers["Set-Cookie"]
    assert response.status_code == 303
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=lax" in cookie


def test_adapters_return_safe_error_for_unsupported_provider() -> None:
    app = Flask(__name__)
    flask_adapter = FlaskReverseHttpOAuth(build_core())
    with app.test_request_context():
        flask_response = flask_adapter.start("unsupported")
    assert flask_response.status_code == 400
    assert flask_response.get_json()["error"] == "unsupported_provider"

    fastapi_response = FastAPIReverseHttpOAuth(build_core()).start("unsupported")
    assert fastapi_response.status_code == 400


def test_flask_callback_clears_cookie_after_success() -> None:
    core = build_core(lambda request: httpx.Response(200, json=IDENTITY))
    adapter = FlaskReverseHttpOAuth(core)
    app = Flask(__name__)
    app.add_url_rule("/oauth/start/<provider>", view_func=adapter.start)
    app.add_url_rule(
        "/oauth/callback",
        view_func=lambda: adapter.callback(
            lambda identity, request: {"provider_id": identity.provider_id}
        ),
    )

    client = app.test_client()
    started = client.get("/oauth/start/google")
    state = parse_qs(urlsplit(started.headers["Location"]).query)["state"][0]
    callback = client.get(f"/oauth/callback?{urlencode({'state': state, 'code': CODE})}")

    assert callback.status_code == 200
    assert callback.get_json()["provider_id"] == IDENTITY["provider_id"]
    assert "Max-Age=0" in callback.headers["Set-Cookie"]


def test_fastapi_async_callback_clears_cookie_after_success() -> None:
    core = build_core(lambda request: httpx.Response(200, json=IDENTITY))
    adapter = FastAPIReverseHttpOAuth(core)
    started = adapter.start("google")
    state = parse_qs(urlsplit(started.headers["Location"]).query)["state"][0]
    cookie = started.headers["Set-Cookie"].split(";", 1)[0]
    query = urlencode({"state": state, "code": CODE}).encode("ascii")
    request = Request({
        "type": "http",
        "method": "GET",
        "scheme": "https",
        "path": "/oauth/callback",
        "raw_path": b"/oauth/callback",
        "query_string": query,
        "headers": [(b"cookie", cookie.encode("ascii"))],
        "client": ("127.0.0.1", 1234),
        "server": ("api.example.test", 443),
    })

    response = asyncio.run(adapter.callback(
        request,
        lambda identity, request: {"provider_id": identity.provider_id},
    ))

    assert response.status_code == 200
    assert json.loads(response.body)["provider_id"] == IDENTITY["provider_id"]
    assert "Max-Age=0" in response.headers["Set-Cookie"]

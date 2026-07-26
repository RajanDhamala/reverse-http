from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest

from reverse_http_oauth import OAuthIdentity, ReverseHttpOAuth, ReverseHttpOAuthError


FIXTURES = Path(__file__).parents[2] / "protocol-fixtures"
CLIENT_SECRET = "client-secret-that-is-at-least-32-bytes"
COOKIE_SECRET = "cookie-secret-that-is-at-least-32-bytes"
CODE = "A" * 43


def build_oauth(handler=None) -> ReverseHttpOAuth:
    transport = httpx.MockTransport(handler) if handler else None
    return ReverseHttpOAuth(
        provider_url="https://auth.example.test",
        client_id="application-id",
        client_secret=CLIENT_SECRET,
        callback_url="https://api.example.test/oauth/callback",
        state_cookie_secret=COOKIE_SECRET,
        transport=transport,
    )


def start_values(oauth: ReverseHttpOAuth):
    started = oauth.start("google")
    query = parse_qs(urlsplit(started.authorization_url).query)
    return started, query


def test_start_uses_pkce_and_keeps_secrets_out_of_redirect() -> None:
    oauth = build_oauth()
    started, query = start_values(oauth)

    assert query["client_id"] == ["application-id"]
    assert query["code_challenge_method"] == ["S256"]
    assert len(query["state"][0]) == 43
    assert len(query["code_challenge"][0]) == 43
    assert CLIENT_SECRET not in started.authorization_url
    assert COOKIE_SECRET not in started.authorization_url


def test_callback_exchanges_code_and_preserves_numeric_provider_id_as_string() -> None:
    expected = json.loads((FIXTURES / "identity-valid.json").read_text())
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        assert request.headers["authorization"].startswith("Basic ")
        body = json.loads(request.content)
        assert body["code"] == CODE
        assert body["redirect_uri"] == "https://api.example.test/oauth/callback"
        assert len(body["code_verifier"]) == 43
        return httpx.Response(200, json=expected)

    oauth = build_oauth(handler)
    started, query = start_values(oauth)
    identity = oauth.handle_callback(
        {"state": query["state"][0], "code": CODE},
        started.cookie_value,
    )

    assert identity == OAuthIdentity(**expected)
    assert isinstance(identity.provider_id, str)
    assert len(requests) == 1


def test_state_mismatch_fails_before_exchange() -> None:
    called = False

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal called
        called = True
        return httpx.Response(500)

    oauth = build_oauth(handler)
    started, _ = start_values(oauth)
    with pytest.raises(ReverseHttpOAuthError, match="could not be completed") as caught:
        oauth.handle_callback({"state": "wrong", "code": CODE}, started.cookie_value)

    assert caught.value.code == "invalid_state"
    assert called is False
    assert CLIENT_SECRET not in str(caught.value)


def test_provider_redis_failure_is_safe_and_does_not_exchange() -> None:
    called = False

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal called
        called = True
        return httpx.Response(500)

    oauth = build_oauth(handler)
    started, query = start_values(oauth)
    with pytest.raises(ReverseHttpOAuthError) as caught:
        oauth.handle_callback(
            {"state": query["state"][0], "error": "temporarily_unavailable"},
            started.cookie_value,
        )

    assert caught.value.code == "provider_unavailable"
    assert caught.value.status == 503
    assert called is False


def test_invalid_grant_and_malformed_identity_are_generic() -> None:
    invalid_grant = json.loads((FIXTURES / "invalid-grant.json").read_text())
    responses = iter((
        httpx.Response(400, json=invalid_grant),
        httpx.Response(200, json={"provider_name": "google", "provider_id": 123}),
    ))

    def handler(request: httpx.Request) -> httpx.Response:
        return next(responses)

    oauth = build_oauth(handler)
    for expected_code in ("invalid_grant", "invalid_response"):
        started, query = start_values(oauth)
        with pytest.raises(ReverseHttpOAuthError) as caught:
            oauth.handle_callback(
                {"state": query["state"][0], "code": CODE},
                started.cookie_value,
            )
        assert caught.value.code == expected_code


def test_non_json_provider_failure_maps_to_unavailable() -> None:
    oauth = build_oauth(lambda request: httpx.Response(503, text="upstream detail"))
    started, query = start_values(oauth)

    with pytest.raises(ReverseHttpOAuthError) as caught:
        oauth.handle_callback(
            {"state": query["state"][0], "code": CODE},
            started.cookie_value,
        )

    assert caught.value.code == "provider_unavailable"
    assert caught.value.status == 503
    assert "upstream detail" not in str(caught.value)


def test_http_callback_is_supported_while_provider_stays_https_only() -> None:
    arguments = dict(
        provider_url="https://auth.example.test",
        client_id="application-id",
        client_secret=CLIENT_SECRET,
        callback_url="http://public.example.test/oauth/callback",
        state_cookie_secret=COOKIE_SECRET,
    )
    oauth = ReverseHttpOAuth(**arguments)
    assert oauth.secure_cookie is False

    with pytest.raises(TypeError):
        ReverseHttpOAuth(
            **{**arguments, "provider_url": "http://public.example.com"},
            allow_insecure_development=True,
        )

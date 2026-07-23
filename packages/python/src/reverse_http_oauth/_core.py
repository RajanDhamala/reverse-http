from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import json
import re
import secrets
import time
from dataclasses import dataclass
from typing import Any, Mapping, Optional, Sequence
from urllib.parse import urlencode, urlsplit, urlunsplit

import httpx


_PROVIDERS = frozenset(("google", "github"))
_MAX_RESPONSE_BYTES = 65_536
_PRIVATE_NETWORKS = tuple(
    ipaddress.ip_network(value)
    for value in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7")
)


@dataclass(frozen=True)
class OAuthIdentity:
    provider_name: str
    provider_id: str
    email: Optional[str]
    email_verified: bool
    username: Optional[str]
    avatar: Optional[str]


@dataclass(frozen=True)
class OAuthStart:
    authorization_url: str
    cookie_value: str


class ReverseHttpOAuthError(Exception):
    def __init__(self, code: str, status: int = 400) -> None:
        super().__init__("OAuth authentication could not be completed.")
        self.code = code
        self.status = status


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode_base64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _is_local_hostname(hostname: str) -> bool:
    normalized = hostname.rstrip(".").lower()
    if normalized == "localhost" or normalized.endswith(".localhost"):
        return True
    try:
        address = ipaddress.ip_address(normalized)
    except ValueError:
        return False
    return address.is_loopback or any(address in network for network in _PRIVATE_NETWORKS)


def _trusted_url(
    value: str,
    label: str,
    allow_insecure_development: bool,
    allow_query: bool,
    allow_http: bool,
) -> str:
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except (TypeError, ValueError) as error:
        raise TypeError(f"{label} must be an absolute URL") from error
    if (
        not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.fragment
        or (parsed.query and not allow_query)
        or (port is None and ":" in parsed.netloc and parsed.netloc.endswith(":"))
    ):
        raise TypeError(f"{label} must not include credentials or a fragment")
    secure = parsed.scheme == "https"
    accepted_http = (
        parsed.scheme == "http"
        and (
            allow_http
            or (allow_insecure_development and _is_local_hostname(parsed.hostname))
        )
    )
    if not secure and not accepted_http:
        raise TypeError(f"{label} must use HTTPS unless local development is explicitly enabled")
    return urlunsplit(parsed)


def _query_value(query: Mapping[str, Any], name: str) -> Optional[str]:
    value = query.get(name)
    return value if isinstance(value, str) else None


class ReverseHttpOAuth:
    def __init__(
        self,
        *,
        provider_url: str,
        client_id: str,
        client_secret: str,
        callback_url: str,
        state_cookie_secret: str,
        allowed_providers: Sequence[str] = ("google", "github"),
        state_ttl_seconds: int = 300,
        exchange_timeout_seconds: float = 10.0,
        allow_insecure_development: bool = False,
        cookie_name: str = "reverse_http_oauth_state",
        transport: Optional[httpx.BaseTransport] = None,
        async_transport: Optional[httpx.AsyncBaseTransport] = None,
    ) -> None:
        if not client_id or not client_secret or not state_cookie_secret:
            raise TypeError("client_id, client_secret, and state_cookie_secret are required")
        if len(client_secret.encode("utf-8")) < 32 or len(state_cookie_secret.encode("utf-8")) < 32:
            raise TypeError("client_secret and state_cookie_secret must each contain at least 32 bytes")
        providers = frozenset(allowed_providers)
        if not providers or not providers.issubset(_PROVIDERS):
            raise TypeError("allowed_providers contains an unsupported provider")
        if state_ttl_seconds <= 0 or exchange_timeout_seconds <= 0:
            raise TypeError("state and exchange timeouts must be positive")
        if not cookie_name or any(character in cookie_name for character in "=;, \t\r\n"):
            raise TypeError("cookie_name is invalid")

        self.provider_url = _trusted_url(
            provider_url, "provider_url", allow_insecure_development, False, False
        ).rstrip("/")
        self.callback_url = _trusted_url(
            callback_url, "callback_url", allow_insecure_development, True, True
        )
        self.client_id = client_id
        self._client_secret = client_secret
        self._state_cookie_secret = state_cookie_secret.encode("utf-8")
        self.allowed_providers = providers
        self.state_ttl_seconds = state_ttl_seconds
        self.exchange_timeout_seconds = exchange_timeout_seconds
        self.cookie_name = cookie_name
        self._transport = transport
        self._async_transport = async_transport

    @property
    def cookie_path(self) -> str:
        return urlsplit(self.callback_url).path or "/"

    @property
    def secure_cookie(self) -> bool:
        return urlsplit(self.callback_url).scheme == "https"

    def start(self, provider: str) -> OAuthStart:
        if provider not in self.allowed_providers:
            raise ReverseHttpOAuthError("unsupported_provider")
        transaction = {
            "state": _base64url(secrets.token_bytes(32)),
            "verifier": _base64url(secrets.token_bytes(32)),
            "provider": provider,
            "issued_at": int(time.time()),
        }
        payload = _base64url(json.dumps(transaction, separators=(",", ":")).encode("utf-8"))
        signature = _base64url(hmac.new(self._state_cookie_secret, payload.encode("ascii"), hashlib.sha256).digest())
        challenge = _base64url(hashlib.sha256(transaction["verifier"].encode("ascii")).digest())
        query = urlencode({
            "client_id": self.client_id,
            "state": transaction["state"],
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        })
        return OAuthStart(
            authorization_url=f"{self.provider_url}/oauth/{provider}?{query}",
            cookie_value=f"{payload}.{signature}",
        )

    def handle_callback(self, query: Mapping[str, Any], cookie_value: Optional[str]) -> OAuthIdentity:
        transaction = self._read_transaction(cookie_value)
        self._validate_callback(query, transaction)
        return self._exchange(
            _query_value(query, "code") or "",
            transaction["verifier"],
            transaction["provider"],
        )

    async def handle_callback_async(self, query: Mapping[str, Any], cookie_value: Optional[str]) -> OAuthIdentity:
        transaction = self._read_transaction(cookie_value)
        self._validate_callback(query, transaction)
        return await self._exchange_async(
            _query_value(query, "code") or "",
            transaction["verifier"],
            transaction["provider"],
        )

    def _read_transaction(self, cookie_value: Optional[str]) -> dict[str, Any]:
        if not cookie_value or len(cookie_value) > 2048:
            raise ReverseHttpOAuthError("invalid_state")
        parts = cookie_value.split(".")
        if len(parts) != 2 or not all(parts):
            raise ReverseHttpOAuthError("invalid_state")
        payload, signature = parts
        expected = _base64url(hmac.new(self._state_cookie_secret, payload.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ReverseHttpOAuthError("invalid_state")
        try:
            transaction = json.loads(_decode_base64url(payload))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ReverseHttpOAuthError("invalid_state") from error
        if not isinstance(transaction, dict):
            raise ReverseHttpOAuthError("invalid_state")
        state = transaction.get("state")
        verifier = transaction.get("verifier")
        provider = transaction.get("provider")
        issued_at = transaction.get("issued_at")
        if (
            not isinstance(state, str)
            or len(state) != 43
            or not isinstance(verifier, str)
            or len(verifier) != 43
            or provider not in self.allowed_providers
            or not isinstance(issued_at, int)
            or isinstance(issued_at, bool)
        ):
            raise ReverseHttpOAuthError("invalid_state")
        age = int(time.time()) - issued_at
        if age < 0 or age > self.state_ttl_seconds:
            raise ReverseHttpOAuthError("invalid_state")
        return transaction

    def _validate_callback(self, query: Mapping[str, Any], transaction: Mapping[str, Any]) -> None:
        returned_state = _query_value(query, "state")
        if not returned_state or not hmac.compare_digest(returned_state, transaction["state"]):
            raise ReverseHttpOAuthError("invalid_state")
        provider_error = _query_value(query, "error")
        if provider_error in ("temporarily_unavailable", "server_error"):
            raise ReverseHttpOAuthError("provider_unavailable", 503)
        if provider_error:
            raise ReverseHttpOAuthError("provider_error")
        code = _query_value(query, "code")
        if not code or not re.fullmatch(r"[A-Za-z0-9_-]{43}", code):
            raise ReverseHttpOAuthError("invalid_grant")
        try:
            if len(_decode_base64url(code)) != 32:
                raise ValueError
        except (ValueError, UnicodeEncodeError) as error:
            raise ReverseHttpOAuthError("invalid_grant") from error

    def _exchange_payload(self, code: str, verifier: str) -> dict[str, str]:
        return {
            "code": code,
            "redirect_uri": self.callback_url,
            "code_verifier": verifier,
        }

    def _authorization_header(self) -> str:
        credentials = base64.b64encode(f"{self.client_id}:{self._client_secret}".encode("utf-8")).decode("ascii")
        return f"Basic {credentials}"

    def _exchange(self, code: str, verifier: str, provider: str) -> OAuthIdentity:
        try:
            with httpx.Client(
                timeout=self.exchange_timeout_seconds,
                follow_redirects=False,
                transport=self._transport,
            ) as client:
                with client.stream(
                    "POST",
                    f"{self.provider_url}/oauth/exchange",
                    headers={
                        "Accept": "application/json",
                        "Authorization": self._authorization_header(),
                        "Content-Type": "application/json",
                    },
                    json=self._exchange_payload(code, verifier),
                ) as response:
                    body = self._read_response(response.iter_bytes())
                    return self._parse_exchange_response(response.status_code, body, provider)
        except ReverseHttpOAuthError:
            raise
        except (httpx.HTTPError, OSError):
            raise ReverseHttpOAuthError("provider_unavailable", 503) from None

    async def _exchange_async(self, code: str, verifier: str, provider: str) -> OAuthIdentity:
        try:
            async with httpx.AsyncClient(
                timeout=self.exchange_timeout_seconds,
                follow_redirects=False,
                transport=self._async_transport,
            ) as client:
                async with client.stream(
                    "POST",
                    f"{self.provider_url}/oauth/exchange",
                    headers={
                        "Accept": "application/json",
                        "Authorization": self._authorization_header(),
                        "Content-Type": "application/json",
                    },
                    json=self._exchange_payload(code, verifier),
                ) as response:
                    body = await self._read_response_async(response.aiter_bytes())
                    return self._parse_exchange_response(response.status_code, body, provider)
        except ReverseHttpOAuthError:
            raise
        except (httpx.HTTPError, OSError):
            raise ReverseHttpOAuthError("provider_unavailable", 503) from None

    @staticmethod
    def _read_response(chunks: Any) -> bytes:
        body = bytearray()
        for chunk in chunks:
            body.extend(chunk)
            if len(body) > _MAX_RESPONSE_BYTES:
                raise ReverseHttpOAuthError("invalid_response", 502)
        return bytes(body)

    @staticmethod
    async def _read_response_async(chunks: Any) -> bytes:
        body = bytearray()
        async for chunk in chunks:
            body.extend(chunk)
            if len(body) > _MAX_RESPONSE_BYTES:
                raise ReverseHttpOAuthError("invalid_response", 502)
        return bytes(body)

    @staticmethod
    def _parse_exchange_response(status: int, body: bytes, provider: str) -> OAuthIdentity:
        if status < 200 or status >= 300:
            error_code = None
            try:
                error_value = json.loads(body)
                if isinstance(error_value, dict):
                    error_code = error_value.get("error")
            except (UnicodeDecodeError, json.JSONDecodeError):
                pass
            if error_code == "invalid_grant":
                raise ReverseHttpOAuthError("invalid_grant")
            raise ReverseHttpOAuthError(
                "provider_unavailable", 503 if status >= 500 or status == 429 else 400
            )

        try:
            value = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ReverseHttpOAuthError("invalid_response", 502) from None
        if not isinstance(value, dict):
            raise ReverseHttpOAuthError("invalid_response", 502)

        provider_name = value.get("provider_name")
        provider_id = value.get("provider_id")
        email_verified = value.get("email_verified")
        if provider_name != provider or not isinstance(provider_id, str) or not provider_id or not isinstance(email_verified, bool):
            raise ReverseHttpOAuthError("invalid_response", 502)

        optional_values = {}
        for field in ("email", "username", "avatar"):
            item = value.get(field)
            if item is not None and not isinstance(item, str):
                raise ReverseHttpOAuthError("invalid_response", 502)
            optional_values[field] = item
        return OAuthIdentity(
            provider_name=provider,
            provider_id=provider_id,
            email=optional_values["email"],
            email_verified=email_verified,
            username=optional_values["username"],
            avatar=optional_values["avatar"],
        )

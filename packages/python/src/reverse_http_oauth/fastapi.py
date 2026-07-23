from __future__ import annotations

import inspect
from typing import Any, Awaitable, Callable, Optional, Union

from fastapi import Request
from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse, Response

from ._core import OAuthIdentity, ReverseHttpOAuth, ReverseHttpOAuthError


HandlerResult = Union[Response, dict[str, Any], str, None]
SuccessHandler = Callable[[OAuthIdentity, Request], Union[HandlerResult, Awaitable[HandlerResult]]]
ErrorHandler = Callable[[ReverseHttpOAuthError, Request], Union[HandlerResult, Awaitable[HandlerResult]]]


class FastAPIReverseHttpOAuth:
    def __init__(self, oauth: ReverseHttpOAuth) -> None:
        self.oauth = oauth

    def start(self, provider: str) -> Response:
        try:
            started = self.oauth.start(provider)
        except ReverseHttpOAuthError as error:
            response = self._error_response(error)
            response.headers["Cache-Control"] = "no-store"
            return response
        response = RedirectResponse(started.authorization_url, status_code=303)
        response.headers["Cache-Control"] = "no-store"
        response.set_cookie(
            self.oauth.cookie_name,
            started.cookie_value,
            max_age=self.oauth.state_ttl_seconds,
            secure=self.oauth.secure_cookie,
            httponly=True,
            samesite="lax",
            path=self.oauth.cookie_path,
        )
        return response

    async def callback(
        self,
        request: Request,
        on_authenticated: SuccessHandler,
        on_error: Optional[ErrorHandler] = None,
    ) -> Response:
        try:
            identity = await self.oauth.handle_callback_async(
                request.query_params,
                request.cookies.get(self.oauth.cookie_name),
            )
            result = on_authenticated(identity, request)
            response = self._as_response(await result if inspect.isawaitable(result) else result)
        except ReverseHttpOAuthError as error:
            if on_error is not None:
                try:
                    result = on_error(error, request)
                    response = self._as_response(await result if inspect.isawaitable(result) else result)
                except Exception:
                    response = self._error_response(ReverseHttpOAuthError("callback_failed", 500))
            else:
                response = self._error_response(error)
        except Exception:
            response = self._error_response(ReverseHttpOAuthError("callback_failed", 500))

        response.headers["Cache-Control"] = "no-store"
        response.delete_cookie(
            self.oauth.cookie_name,
            path=self.oauth.cookie_path,
            secure=self.oauth.secure_cookie,
            httponly=True,
            samesite="lax",
        )
        return response

    @staticmethod
    def _as_response(value: HandlerResult) -> Response:
        if isinstance(value, Response):
            return value
        if value is None:
            return Response(status_code=204)
        if isinstance(value, str):
            return PlainTextResponse(value)
        return JSONResponse(value)

    @staticmethod
    def _error_response(error: ReverseHttpOAuthError) -> Response:
        return JSONResponse(
            {
                "error": error.code,
                "error_description": "OAuth authentication could not be completed.",
            },
            status_code=error.status,
        )

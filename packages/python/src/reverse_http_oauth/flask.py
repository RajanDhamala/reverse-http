from __future__ import annotations

from typing import Any, Callable, Optional

from flask import Response, jsonify, make_response, redirect, request

from ._core import OAuthIdentity, ReverseHttpOAuth, ReverseHttpOAuthError


SuccessHandler = Callable[[OAuthIdentity, Any], Any]
ErrorHandler = Callable[[ReverseHttpOAuthError, Any], Any]


class FlaskReverseHttpOAuth:
    def __init__(self, oauth: ReverseHttpOAuth) -> None:
        self.oauth = oauth

    def start(self, provider: str) -> Response:
        try:
            started = self.oauth.start(provider)
        except ReverseHttpOAuthError as error:
            response = self._error_response(error)
            response.headers["Cache-Control"] = "no-store"
            return response
        response = redirect(started.authorization_url, code=303)
        response.headers["Cache-Control"] = "no-store"
        response.set_cookie(
            self.oauth.cookie_name,
            started.cookie_value,
            max_age=self.oauth.state_ttl_seconds,
            secure=self.oauth.secure_cookie,
            httponly=True,
            samesite="Lax",
            path=self.oauth.cookie_path,
        )
        return response

    def callback(
        self,
        on_authenticated: SuccessHandler,
        on_error: Optional[ErrorHandler] = None,
    ) -> Response:
        try:
            identity = self.oauth.handle_callback(
                request.args,
                request.cookies.get(self.oauth.cookie_name),
            )
            response = make_response(on_authenticated(identity, request))
        except ReverseHttpOAuthError as error:
            if on_error is not None:
                try:
                    response = make_response(on_error(error, request))
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
            samesite="Lax",
        )
        return response

    @staticmethod
    def _error_response(error: ReverseHttpOAuthError) -> Response:
        response = jsonify({
            "error": error.code,
            "error_description": "OAuth authentication could not be completed.",
        })
        response.status_code = error.status
        return response

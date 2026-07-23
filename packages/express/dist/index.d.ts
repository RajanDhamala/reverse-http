import { Request, Response, RequestHandler } from 'express';

type OAuthProvider = "google" | "github";
interface OAuthIdentity {
    provider_name: string;
    provider_id: string;
    email: string | null;
    email_verified: boolean;
    username: string | null;
    avatar: string | null;
}
type ReverseHttpOAuthErrorCode = "invalid_state" | "provider_error" | "invalid_grant" | "provider_unavailable" | "invalid_response" | "callback_failed";
declare class ReverseHttpOAuthError extends Error {
    readonly code: ReverseHttpOAuthErrorCode;
    readonly status: number;
    constructor(code: ReverseHttpOAuthErrorCode, status?: number);
}
interface ReverseHttpOAuthConfig {
    providerUrl: string;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    stateCookieSecret: string;
    allowedProviders?: readonly OAuthProvider[];
    stateTtlSeconds?: number;
    exchangeTimeoutMs?: number;
    allowInsecureDevelopment?: boolean;
    cookieName?: string;
}
interface AuthenticatedContext {
    identity: OAuthIdentity;
    req: Request;
    res: Response;
}
interface ErrorContext {
    error: ReverseHttpOAuthError;
    req: Request;
    res: Response;
}
interface CallbackOptions {
    onAuthenticated(context: AuthenticatedContext): void | Promise<void>;
    onError?(context: ErrorContext): void | Promise<void>;
}
declare function createReverseHttpOAuth(input: ReverseHttpOAuthConfig): {
    readonly start: () => RequestHandler;
    readonly callback: (options: CallbackOptions) => RequestHandler;
};

export { type AuthenticatedContext, type CallbackOptions, type ErrorContext, type OAuthIdentity, type OAuthProvider, type ReverseHttpOAuthConfig, ReverseHttpOAuthError, type ReverseHttpOAuthErrorCode, createReverseHttpOAuth };

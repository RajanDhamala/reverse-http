import {
  forwardRef,
  useCallback,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from "react";

export type OAuthProvider = "google" | "github";

export interface OAuthLoginOptions {
  backendUrl: string;
  startPath?: string;
}

function validateProvider(provider: string): asserts provider is OAuthProvider {
  if (provider !== "google" && provider !== "github") {
    throw new TypeError("provider must be google or github");
  }
}

export function buildOAuthStartUrl(
  backendUrl: string,
  provider: OAuthProvider,
  startPath = "/oauth/start",
): string {
  validateProvider(provider);
  let backend: URL;
  try {
    backend = new URL(backendUrl);
  } catch {
    throw new TypeError("backendUrl must be an absolute HTTP or HTTPS URL");
  }
  const trustedProtocol = backend.protocol === "https:" || backend.protocol === "http:";
  if (!trustedProtocol || backend.username || backend.password || backend.hash || backend.search) {
    throw new TypeError("backendUrl must be an absolute HTTP or HTTPS URL without credentials, query, or fragment");
  }
  if (!startPath.startsWith("/") || startPath.startsWith("//") || startPath.includes("?") || startPath.includes("#")) {
    throw new TypeError("startPath must be an absolute path");
  }

  const base = backend.toString().replace(/\/+$/, "");
  const path = startPath.replace(/\/+$/, "");
  return `${base}${path}/${encodeURIComponent(provider)}`;
}

export function useOAuthLogin({ backendUrl, startPath }: OAuthLoginOptions) {
  return useCallback((provider: OAuthProvider) => {
    window.location.assign(buildOAuthStartUrl(backendUrl, provider, startPath));
  }, [backendUrl, startPath]);
}

export interface OAuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  backendUrl: string;
  provider: OAuthProvider;
  startPath?: string;
}

export const OAuthButton = forwardRef<HTMLButtonElement, OAuthButtonProps>(function OAuthButton(
  { backendUrl, provider, startPath, onClick, children, ...buttonProps },
  ref,
) {
  const login = useOAuthLogin({ backendUrl, startPath });
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) login(provider);
  };

  return (
    <button {...buttonProps} ref={ref} type="button" onClick={handleClick}>
      {children}
    </button>
  );
});

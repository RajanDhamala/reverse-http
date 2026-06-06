const DEFAULT_API_BASE_URL = "/api";
const DEFAULT_FRONTEND_BASE_URL = "http://localhost:5173";

function browserOrigin() {
  if (typeof window === "undefined" || !window.location.origin) {
    return DEFAULT_FRONTEND_BASE_URL;
  }
  return window.location.origin;
}

function normalizeBaseUrl(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL, DEFAULT_API_BASE_URL);
export const FRONTEND_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_FRONTEND_BASE_URL, browserOrigin());

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function frontendUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${FRONTEND_BASE_URL}${normalizedPath}`;
}

export function frontendAddress(path: string) {
  try {
    const url = new URL(frontendUrl(path));
    return `${url.host}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return frontendUrl(path).replace(/^https?:\/\//, "");
  }
}

export function oauthProviderUrl(provider: "github" | "google", routeID?: string) {
  const query = routeID ? `?client_id=${encodeURIComponent(routeID)}` : "";
  return apiUrl(`/oauth/${provider}${query}`);
}

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ReverseHttpOAuthError: () => ReverseHttpOAuthError,
  createReverseHttpOAuth: () => createReverseHttpOAuth
});
module.exports = __toCommonJS(index_exports);
var import_node_crypto = require("crypto");
var ReverseHttpOAuthError = class extends Error {
  code;
  status;
  constructor(code, status = 400) {
    super("OAuth authentication could not be completed.");
    this.name = "ReverseHttpOAuthError";
    this.code = code;
    this.status = status;
  }
};
var providerValues = /* @__PURE__ */ new Set(["google", "github"]);
function isPrivateIPv4(hostname) {
  const rawParts = hostname.split(".");
  if (rawParts.length !== 4 || rawParts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }
  const parts = rawParts.map(Number);
  if (parts.some((part) => part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31 || parts[0] === 192 && parts[1] === 168;
}
function isLocalHostname(hostname) {
  const lowered = hostname.toLowerCase();
  const normalized = lowered.startsWith("[") && lowered.endsWith("]") ? lowered.slice(1, -1) : lowered;
  return normalized === "localhost" || normalized.endsWith(".localhost") || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || isPrivateIPv4(normalized);
}
function parseTrustedUrl(value, label, allowInsecureDevelopment, allowQuery, allowHttp) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${label} must be an absolute URL`);
  }
  if (parsed.username || parsed.password || parsed.hash || !allowQuery && parsed.search) {
    throw new TypeError(`${label} must not include credentials or a fragment`);
  }
  const acceptedHttp = parsed.protocol === "http:" && (allowHttp || allowInsecureDevelopment && isLocalHostname(parsed.hostname));
  if (parsed.protocol !== "https:" && !acceptedHttp) {
    throw new TypeError(`${label} must use HTTPS unless local development is explicitly enabled`);
  }
  return parsed;
}
function normalizeConfig(config) {
  const allowInsecureDevelopment = config.allowInsecureDevelopment ?? false;
  const stateTtlSeconds = config.stateTtlSeconds ?? 300;
  const exchangeTimeoutMs = config.exchangeTimeoutMs ?? 1e4;
  const cookieName = config.cookieName ?? "reverse_http_oauth_state";
  if (!config.clientId || !config.clientSecret || !config.stateCookieSecret) {
    throw new TypeError("clientId, clientSecret, and stateCookieSecret are required");
  }
  if (Buffer.byteLength(config.clientSecret) < 32 || Buffer.byteLength(config.stateCookieSecret) < 32) {
    throw new TypeError("clientSecret and stateCookieSecret must each contain at least 32 bytes");
  }
  if (!Number.isInteger(stateTtlSeconds) || stateTtlSeconds <= 0 || !Number.isFinite(exchangeTimeoutMs) || exchangeTimeoutMs <= 0) {
    throw new TypeError("state and exchange timeouts must be positive");
  }
  if (!cookieName || /[=;,\s]/.test(cookieName)) {
    throw new TypeError("cookieName is invalid");
  }
  const allowedProviders = config.allowedProviders ?? ["google", "github"];
  if (allowedProviders.length === 0 || allowedProviders.some((provider) => !providerValues.has(provider))) {
    throw new TypeError("allowedProviders contains an unsupported provider");
  }
  return {
    providerUrl: parseTrustedUrl(config.providerUrl, "providerUrl", allowInsecureDevelopment, false, false),
    callbackUrl: parseTrustedUrl(config.callbackUrl, "callbackUrl", allowInsecureDevelopment, true, true),
    callbackUrlValue: config.callbackUrl,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    stateCookieSecret: config.stateCookieSecret,
    allowedProviders: new Set(allowedProviders),
    stateTtlSeconds,
    exchangeTimeoutMs,
    cookieName
  };
}
function base64url(value) {
  return Buffer.from(value).toString("base64url");
}
function secureEqual(left, right) {
  const leftDigest = (0, import_node_crypto.createHash)("sha256").update(left).digest();
  const rightDigest = (0, import_node_crypto.createHash)("sha256").update(right).digest();
  return (0, import_node_crypto.timingSafeEqual)(leftDigest, rightDigest);
}
function signTransaction(transaction, secret) {
  const payload = base64url(JSON.stringify(transaction));
  const signature = (0, import_node_crypto.createHmac)("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
function readTransaction(value, config) {
  if (!value || value.length > 2048) {
    throw new ReverseHttpOAuthError("invalid_state");
  }
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) {
    throw new ReverseHttpOAuthError("invalid_state");
  }
  const expected = (0, import_node_crypto.createHmac)("sha256", config.stateCookieSecret).update(payload).digest("base64url");
  if (!secureEqual(signature, expected)) {
    throw new ReverseHttpOAuthError("invalid_state");
  }
  let transaction;
  try {
    transaction = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new ReverseHttpOAuthError("invalid_state");
  }
  const age = Math.floor(Date.now() / 1e3) - transaction.issuedAt;
  if (typeof transaction.state !== "string" || transaction.state.length !== 43 || typeof transaction.verifier !== "string" || transaction.verifier.length !== 43 || typeof transaction.issuedAt !== "number" || !Number.isInteger(transaction.issuedAt) || !config.allowedProviders.has(transaction.provider) || age < 0 || age > config.stateTtlSeconds) {
    throw new ReverseHttpOAuthError("invalid_state");
  }
  return transaction;
}
function parseCookies(header) {
  const cookies = {};
  for (const part of (header ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      continue;
    }
  }
  return cookies;
}
function serializeCookie(config, value, clear = false) {
  const path = config.callbackUrl.pathname || "/";
  const parts = [
    `${config.cookieName}=${clear ? "" : encodeURIComponent(value)}`,
    `Path=${path}`,
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (config.callbackUrl.protocol === "https:") parts.push("Secure");
  if (clear) {
    parts.push("Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  } else {
    parts.push(`Max-Age=${config.stateTtlSeconds}`);
  }
  return parts.join("; ");
}
function authorizationUrl(config, provider, transaction) {
  const base = config.providerUrl.toString().replace(/\/+$/, "");
  const target = new URL(`${base}/oauth/${encodeURIComponent(provider)}`);
  target.searchParams.set("client_id", config.clientId);
  target.searchParams.set("state", transaction.state);
  target.searchParams.set("code_challenge", (0, import_node_crypto.createHash)("sha256").update(transaction.verifier).digest("base64url"));
  target.searchParams.set("code_challenge_method", "S256");
  return target.toString();
}
function readQueryValue(value) {
  return typeof value === "string" ? value : void 0;
}
function validAuthorizationCode(value) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
function validateIdentity(value, expectedProvider) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ReverseHttpOAuthError("invalid_response", 502);
  }
  const identity = value;
  const optionalString = (field) => {
    const item = identity[field];
    if (item === null) return null;
    if (typeof item !== "string") throw new ReverseHttpOAuthError("invalid_response", 502);
    return item;
  };
  if (identity.provider_name !== expectedProvider || typeof identity.provider_id !== "string" || !identity.provider_id) {
    throw new ReverseHttpOAuthError("invalid_response", 502);
  }
  if (typeof identity.email_verified !== "boolean") {
    throw new ReverseHttpOAuthError("invalid_response", 502);
  }
  return {
    provider_name: expectedProvider,
    provider_id: identity.provider_id,
    email: optionalString("email"),
    email_verified: identity.email_verified,
    username: optionalString("username"),
    avatar: optionalString("avatar")
  };
}
async function readLimitedResponse(response) {
  const declaredLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > 65536) {
    throw new ReverseHttpOAuthError("invalid_response", 502);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 65536) {
      await reader.cancel();
      throw new ReverseHttpOAuthError("invalid_response", 502);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total).toString("utf8");
}
async function exchangeCode(config, code, verifier, provider) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.exchangeTimeoutMs);
  try {
    const endpoint = new URL("oauth/exchange", `${config.providerUrl.toString().replace(/\/+$/, "")}/`);
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code,
        redirect_uri: config.callbackUrlValue,
        code_verifier: verifier
      }),
      signal: controller.signal
    });
    const body = await readLimitedResponse(response);
    if (!response.ok) {
      let errorCode = "";
      try {
        errorCode = JSON.parse(body).error ?? "";
      } catch {
        errorCode = "";
      }
      if (errorCode === "invalid_grant") throw new ReverseHttpOAuthError("invalid_grant");
      throw new ReverseHttpOAuthError("provider_unavailable", response.status >= 500 ? 503 : 400);
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new ReverseHttpOAuthError("invalid_response", 502);
    }
    return validateIdentity(parsed, provider);
  } catch (error) {
    if (error instanceof ReverseHttpOAuthError) throw error;
    throw new ReverseHttpOAuthError("provider_unavailable", 503);
  } finally {
    clearTimeout(timeout);
  }
}
async function defaultErrorHandler({ error, res }) {
  if (!res.headersSent) {
    res.status(error.status).json({
      error: error.code,
      error_description: "OAuth authentication could not be completed."
    });
  }
}
function createReverseHttpOAuth(input) {
  const config = normalizeConfig(input);
  const start = () => (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const provider = String(req.params.provider ?? "");
    if (!config.allowedProviders.has(provider)) {
      return res.status(400).json({ error: "unsupported_provider" });
    }
    const transaction = {
      state: base64url((0, import_node_crypto.randomBytes)(32)),
      verifier: base64url((0, import_node_crypto.randomBytes)(32)),
      provider,
      issuedAt: Math.floor(Date.now() / 1e3)
    };
    res.append("Set-Cookie", serializeCookie(config, signTransaction(transaction, config.stateCookieSecret)));
    return res.redirect(303, authorizationUrl(config, provider, transaction));
  };
  const callback = (options) => async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.append("Set-Cookie", serializeCookie(config, "", true));
    try {
      const cookies = parseCookies(req.headers.cookie);
      const transaction = readTransaction(cookies[config.cookieName], config);
      const returnedState = readQueryValue(req.query.state);
      if (!returnedState || !secureEqual(returnedState, transaction.state)) {
        throw new ReverseHttpOAuthError("invalid_state");
      }
      const providerError = readQueryValue(req.query.error);
      if (providerError) {
        if (providerError === "temporarily_unavailable" || providerError === "server_error") {
          throw new ReverseHttpOAuthError("provider_unavailable", 503);
        }
        throw new ReverseHttpOAuthError("provider_error");
      }
      const code = readQueryValue(req.query.code);
      if (!code || !validAuthorizationCode(code)) throw new ReverseHttpOAuthError("invalid_grant");
      const identity = await exchangeCode(config, code, transaction.verifier, transaction.provider);
      await options.onAuthenticated({ identity, req, res });
    } catch (error) {
      const safeError = error instanceof ReverseHttpOAuthError ? error : new ReverseHttpOAuthError("callback_failed", 500);
      try {
        await (options.onError ?? defaultErrorHandler)({ error: safeError, req, res });
      } catch {
        if (!res.headersSent) {
          await defaultErrorHandler({
            error: new ReverseHttpOAuthError("callback_failed", 500),
            req,
            res
          });
        }
      }
    }
  };
  return { start, callback };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ReverseHttpOAuthError,
  createReverseHttpOAuth
});

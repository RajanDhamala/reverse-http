import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import { createReverseHttpOAuth } from "@reverse-http/express";

const port = Number(process.env.PORT || 3000);
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
const isProduction = process.env.NODE_ENV === "production";
const authCookieName = "reverse_http_demo_auth";

const oauth = createReverseHttpOAuth({
  providerUrl: process.env.REVERSE_HTTP_PROVIDER_URL,
  clientId: process.env.REVERSE_HTTP_CLIENT_ID,
  clientSecret: process.env.REVERSE_HTTP_CLIENT_SECRET,
  callbackUrl: process.env.REVERSE_HTTP_CALLBACK_URL,
  stateCookieSecret: process.env.OAUTH_STATE_COOKIE_SECRET,
  allowInsecureDevelopment: process.env.ALLOW_INSECURE_DEVELOPMENT === "true",
});

const app = express();

app.disable("x-powered-by");
if (isProduction) app.set("trust proxy", 1);

app.use(cookieParser(process.env.OAUTH_STATE_COOKIE_SECRET));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/oauth/start/:provider", oauth.start());

app.get(
  "/oauth/callback",
  oauth.callback({
    onAuthenticated: ({ identity, res }) => {
      res.cookie(authCookieName, identity, {
        signed: true,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.redirect(303, frontendUrl);
    },
    onError: ({ error, res }) => {
      res.redirect(303, `${frontendUrl}/?oauth_error=${encodeURIComponent(error.code)}`);
    },
  }),
);

app.get("/api/me", (req, res) => {
  const identity = req.signedCookies[authCookieName];

  if (!identity) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true, identity });
});

app.post("/api/logout", (_req, res) => {
  res.clearCookie(authCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
  });
  res.status(204).end();
});

app.listen(port, (error) => {
  if (error) throw error;
  console.log(`Demo API listening on http://localhost:${port}`);
});

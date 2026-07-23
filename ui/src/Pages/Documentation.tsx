import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  Github,
  KeyRound,
  LockKeyhole,
  Network,
  Route,
  ShieldCheck,
  Terminal,
} from "lucide-react";

type Language = "javascript" | "python" | "go";

const languageLabels: Record<Language, string> = {
  javascript: "@reverse-http/express",
  python: "reverse-http-oauth / Flask",
  go: "Go / manual exchange",
};

const codeExamples: Record<Language, string> = {
  javascript: `import express from "express";
import { createReverseHttpOAuth } from "@reverse-http/express";

const app = express();
const oauth = createReverseHttpOAuth({
  providerUrl: process.env.REVERSE_HTTP_PROVIDER_URL,
  clientId: process.env.REVERSE_HTTP_CLIENT_ID,
  clientSecret: process.env.REVERSE_HTTP_CLIENT_SECRET,
  callbackUrl: "https://api.example.com/oauth/callback",
  stateCookieSecret: process.env.OAUTH_STATE_COOKIE_SECRET,
});

app.get("/oauth/start/:provider", oauth.start());
app.get("/oauth/callback", oauth.callback({
  onAuthenticated: async ({ identity, res }) => {
    // Create your own user and session here.
    res.redirect("https://app.example.com");
  },
}));`,
  python: `import os
from flask import Flask, redirect
from reverse_http_oauth import ReverseHttpOAuth
from reverse_http_oauth.flask import FlaskReverseHttpOAuth

app = Flask(__name__)
oauth = FlaskReverseHttpOAuth(ReverseHttpOAuth(
    provider_url=os.environ["REVERSE_HTTP_PROVIDER_URL"],
    client_id=os.environ["REVERSE_HTTP_CLIENT_ID"],
    client_secret=os.environ["REVERSE_HTTP_CLIENT_SECRET"],
    callback_url="https://api.example.com/oauth/callback",
    state_cookie_secret=os.environ["OAUTH_STATE_COOKIE_SECRET"],
))

@app.get("/oauth/start/<provider>")
def oauth_start(provider):
    return oauth.start(provider)

@app.get("/oauth/callback")
def oauth_callback():
    return oauth.callback(
        lambda identity, request: redirect("https://app.example.com")
    )`,
  go: `package main

import (
  "bytes"
  "encoding/base64"
  "encoding/json"
  "net/http"
  "os"
)

func exchange(code, verifier string) (*http.Response, error) {
  body, _ := json.Marshal(map[string]string{
    "code": code,
    "code_verifier": verifier,
    "redirect_uri": "https://api.example.com/oauth/callback",
  })
  req, _ := http.NewRequest("POST", os.Getenv("REVERSE_HTTP_PROVIDER_URL")+"/oauth/exchange", bytes.NewReader(body))
  credentials := base64.StdEncoding.EncodeToString([]byte(os.Getenv("REVERSE_HTTP_CLIENT_ID")+":"+os.Getenv("REVERSE_HTTP_CLIENT_SECRET")))
  req.Header.Set("Authorization", "Basic "+credentials)
  req.Header.Set("Content-Type", "application/json")
  return http.DefaultClient.Do(req)
}`,
};

const flowSteps = [
  { icon: <Network className="h-4 w-4" />, title: "Backend start", text: "Your backend creates state and PKCE, then redirects to Reverse HTTP." },
  { icon: <ShieldCheck className="h-4 w-4" />, title: "Provider callback", text: "Reverse HTTP handles provider code exchange and userinfo." },
  { icon: <KeyRound className="h-4 w-4" />, title: "One-time code", text: "A short-lived opaque code is bound to your route and PKCE challenge." },
  { icon: <Route className="h-4 w-4" />, title: "Backend exchange", text: "Your callback exchanges the code once, then creates its own session." },
];

const payloadFields = [
  "provider_name",
  "provider_id",
  "email",
  "email_verified",
  "username",
  "avatar",
];

function highlightCode(code: string) {
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*|\b(?:import|from|const|try|catch|return|if|func|package|def|app|get|GET|string|interface|nil|true|false)\b|\b\d+\b|[{}()[\].,;:=<>?]+)/g;
  const pieces: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code))) {
    if (match.index > lastIndex) pieces.push(code.slice(lastIndex, match.index));
    const token = match[0];
    const className = token.startsWith('"') || token.startsWith("'") || token.startsWith("`")
      ? "text-emerald-300"
      : token.startsWith("//") || token.startsWith("#")
        ? "text-gray-500"
        : /^\d+$/.test(token)
          ? "text-amber-300"
          : /^[{}()[\].,;:=<>?]+$/.test(token)
            ? "text-gray-500"
            : "text-cyan-300";
    pieces.push(<span key={`${match.index}-${token}`} className={className}>{token}</span>);
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < code.length) pieces.push(code.slice(lastIndex));
  return pieces;
}

function CodeBlock({ code, copied, onCopy }: { code: string; copied?: boolean; onCopy?: () => void }) {
  return (
    <div className="code-window min-w-0">
      {onCopy ? (
        <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
          <span className="font-mono text-xs text-gray-500">callback.ts</span>
          <button type="button" onClick={onCopy} className="inline-flex h-8 items-center gap-2 rounded-md border border-gray-700 px-3 text-xs text-gray-200 hover:border-cyan-400">
            {copied ? <Check className="h-3.5 w-3.5 text-cyan-300" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      <pre className="max-h-[520px] max-w-full overflow-x-auto overflow-y-auto p-4 font-mono text-xs leading-6">
        <code className="block w-max min-w-full whitespace-pre">{highlightCode(code)}</code>
      </pre>
    </div>
  );
}

function LanguageCodePanel() {
  const [language, setLanguage] = useState<Language>("javascript");
  const [copiedLanguage, setCopiedLanguage] = useState<Language | null>(null);
  const code = codeExamples[language];

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopiedLanguage(language);
    window.setTimeout(() => setCopiedLanguage(null), 1600);
  };

  return (
    <div className="chrome-card-strong rounded-xl p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
            <Code2 className="h-4 w-4 text-cyan-600" />
            Handle the backend callback
          </div>
          <p className="mt-1 text-xs text-gray-500">Choose an SDK or use the HTTP exchange contract directly.</p>
        </div>
        <div className="relative w-full sm:w-60">
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="dev-input appearance-none pr-10"
            aria-label="Choose code language"
          >
            {(Object.keys(languageLabels) as Language[]).map((item) => (
              <option key={item} value={item}>{languageLabels[item]}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      <CodeBlock code={code} copied={copiedLanguage === language} onCopy={() => void copyCode()} />
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <main className="app-page grid-canvas overflow-x-hidden">
      <section className="px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="status-pill">One-time OAuth</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-gray-950 md:text-5xl">
              OAuth identity without reusable browser tokens.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600">
              Reverse HTTP verifies provider login, redirects with a short-lived
              code, and returns identity only to your authenticated backend.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Backend callback", "Single use", "Your auth logic"].map((item) => (
                <div key={item} className="chrome-card rounded-lg px-3 py-2 text-xs font-medium text-gray-700">
                  <CheckCircle2 className="mr-2 inline h-3.5 w-3.5 text-cyan-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="chrome-card-strong min-w-0 rounded-xl p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
                <Terminal className="h-4 w-4 text-cyan-600" />
                redirect contract
              </div>
              <span className="mono-chip">browser</span>
            </div>
            <CodeBlock code={`GET /oauth/google?client_id=<route_id>&state=<state>
  &code_challenge=<s256_challenge>&code_challenge_method=S256

303 https://api.example.com/oauth/callback?code=<opaque_code>&state=<state>

POST /oauth/exchange
Authorization: Basic <client_id:client_secret>`} />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 max-w-3xl">
            <span className="status-pill">Flow</span>
            <h2 className="mt-4 text-3xl font-semibold text-gray-950">
              One public provider, one application-owned session.
            </h2>
          </div>
          <div className="chrome-card-strong grid gap-3 rounded-xl p-4 lg:grid-cols-4">
            {flowSteps.map((step, index) => (
              <div key={step.title} className="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-600">
                    {step.icon}
                  </span>
                  <span className="font-mono text-xs text-gray-400">0{index + 1}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-950">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-gray-600">{step.text}</p>
                {index < flowSteps.length - 1 ? (
                  <ArrowRight className="absolute -right-5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-cyan-500 lg:block" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="status-pill">Payload</span>
            <h2 className="mt-4 text-3xl font-semibold text-gray-950">
              The verified identity contract.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              The exchange response uses stable provider identity fields; your application owns its session.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="chrome-card-strong rounded-xl p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-950">
                <LockKeyhole className="h-4 w-4 text-cyan-600" />
                Identity fields
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {payloadFields.map((field) => (
                  <span key={field} className="mono-chip justify-between">
                    {field}
                    <Braces className="ml-2 h-3 w-3 text-cyan-500" />
                  </span>
                ))}
              </div>
            </div>
            <div className="chrome-card-strong rounded-xl p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-950">
                <Github className="h-4 w-4 text-cyan-600" />
                Decoded shape
              </div>
              <CodeBlock code={`{
  "provider_name": "github",
  "provider_id": "14328412",
  "email": "dev@example.com",
  "email_verified": true,
  "username": "Local Dev",
  "avatar": null
}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 max-w-3xl">
            <span className="status-pill">Examples</span>
            <h2 className="mt-4 text-3xl font-semibold text-gray-950">
              Exchange the callback in your backend.
            </h2>
          </div>
          <LanguageCodePanel />
        </div>
      </section>
    </main>
  );
}

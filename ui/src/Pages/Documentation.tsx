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
  Globe2,
  KeyRound,
  LockKeyhole,
  Network,
  Route,
  ShieldCheck,
  Terminal,
} from "lucide-react";

type Language = "javascript" | "python" | "go";

const panelClass =
  "border border-neutral-800 bg-neutral-900/70 shadow-2xl shadow-black/20";

const softPanel =
  "rounded-xl border border-neutral-800 bg-neutral-950/75";

const languageLabels: Record<Language, string> = {
  javascript: "JavaScript / Express",
  python: "Python / Flask",
  go: "Go / Gin",
};

const flowSteps = [
  {
    icon: <Globe2 className="h-4 w-4" aria-hidden="true" />,
    title: "Start OAuth",
    text: "Send the browser to Reverse HTTP with the provider and route id.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
    title: "Verify provider",
    text: "The platform handles Google or GitHub callbacks and userinfo.",
  },
  {
    icon: <LockKeyhole className="h-4 w-4" aria-hidden="true" />,
    title: "Sign payload",
    text: "OAuth data is signed with your route client secret.",
  },
  {
    icon: <Route className="h-4 w-4" aria-hidden="true" />,
    title: "Redirect local",
    text: "Your private backend receives token as a query parameter.",
  },
];

const setupSteps = [
  {
    title: "Create route",
    text: "Add a route name, local callback endpoint, and client secret from the OAuth Routes page.",
  },
  {
    title: "Save route id",
    text: "Use the returned route id as client_id when starting Google or GitHub OAuth.",
  },
  {
    title: "Verify token",
    text: "Your backend verifies the signed token with the same client secret.",
  },
];

const payloadFields = [
  { key: "provider_name", label: "Provider type", value: "github or google" },
  { key: "provider_id", label: "Provider user id", value: "OAuth account id" },
  { key: "email", label: "Email", value: "Verified provider email" },
  { key: "username", label: "Name", value: "Display name" },
  { key: "avatar", label: "Avatar URL", value: "Profile image URL" },
  { key: "exp", label: "Expiry", value: "Short-lived token expiry" },
];

const samplePayload = `{
  "provider_name": "github",
  "provider_id": "14328412",
  "email": "dev@example.com",
  "username": "Local Dev",
  "avatar": "https://avatars.githubusercontent.com/u/14328412",
  "exp": 1735689600
}`;

const codeExamples: Record<Language, string> = {
  javascript: `import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const CLIENT_SECRET = process.env.REVERSE_HTTP_SECRET;

app.get("/oauth/google", (req, res) => {
  try {
    const token = String(req.query.token || "");
    const user = jwt.verify(token, CLIENT_SECRET);

    // Build your own session or custom auth flow here.
    res.json({ message: "OAuth complete", user });
  } catch {
    res.status(400).json({ message: "Invalid OAuth payload" });
  }
});

app.listen(3030);`,
  python: `from flask import Flask, request, jsonify
import jwt
import os

app = Flask(__name__)
CLIENT_SECRET = os.environ["REVERSE_HTTP_SECRET"]

@app.get("/oauth/google")
def oauth_google():
    token = request.args.get("token", "")

    try:
        user = jwt.decode(token, CLIENT_SECRET, algorithms=["HS256"])
        # Build your own session or custom auth flow here.
        return jsonify({"message": "OAuth complete", "user": user})
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid OAuth payload"}), 400`,
  go: `package main

import (
  "net/http"
  "os"

  "github.com/gin-gonic/gin"
  "github.com/golang-jwt/jwt/v5"
)

func main() {
  r := gin.Default()
  secret := []byte(os.Getenv("REVERSE_HTTP_SECRET"))

  r.GET("/oauth/google", func(c *gin.Context) {
    raw := c.Query("token")
    token, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) {
      return secret, nil
    })

    if err != nil || !token.Valid {
      c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid OAuth payload"})
      return
    }

    claims := token.Claims.(jwt.MapClaims)
    // Build your own session or custom auth flow here.
    c.JSON(http.StatusOK, gin.H{"message": "OAuth complete", "user": claims})
  })

  r.Run(":3030")
}`,
};

function SectionTitle({
  icon,
  label,
  title,
  text,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mb-8 max-w-3xl min-w-0">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-500">
        {icon}
        {label}
      </div>
      <h2 className="text-2xl font-semibold text-white md:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-500">{text}</p>
    </div>
  );
}

function highlightCode(code: string) {
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*|\b(?:import|from|const|let|var|try|catch|return|if|func|package|def|except|true|false|null|nil|async|await|app|GET|string|map|interface|type)\b|\b\d+\b|[{}()[\].,;:=<>?]+)/g;
  const pieces: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code))) {
    if (match.index > lastIndex) {
      pieces.push(code.slice(lastIndex, match.index));
    }

    const token = match[0];
    const className = token.startsWith('"') || token.startsWith("'") || token.startsWith("`")
      ? "text-emerald-300"
      : token.startsWith("//") || token.startsWith("#")
        ? "text-neutral-600"
        : /^\d+$/.test(token)
          ? "text-amber-300"
          : /^[{}()[\].,;:=<>?]+$/.test(token)
            ? "text-neutral-500"
            : "text-sky-300";

    pieces.push(
      <span key={`${match.index}-${token}`} className={className}>
        {token}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    pieces.push(code.slice(lastIndex));
  }

  return pieces;
}

function CodeBlock({
  code,
  copied,
  onCopy,
}: {
  code: string;
  copied?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-neutral-800 bg-black">
      {onCopy ? (
        <div className="flex items-center justify-end border-b border-neutral-800 bg-neutral-950 px-3 py-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      <pre className="max-h-[520px] w-full min-w-0 overflow-auto p-4 font-mono text-xs leading-6 text-neutral-300">
        <code>{highlightCode(code)}</code>
      </pre>
    </div>
  );
}

function FlowDiagram() {
  return (
    <div className={panelClass + " min-w-0 rounded-xl p-4 md:p-5"}>
      <div className="grid min-w-0 gap-3 lg:grid-cols-4">
        {flowSteps.map((step, index) => (
          <div key={step.title} className="relative min-w-0">
            <div className={softPanel + " h-full min-w-0 p-4"}>
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300">
                  {step.icon}
                </span>
                <span className="font-mono text-xs text-neutral-600">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-100">
                {step.title}
              </h3>
              <p className="mt-2 text-xs leading-5 text-neutral-500">
                {step.text}
              </p>
            </div>
            {index < flowSteps.length - 1 ? (
              <ArrowRight
                className="absolute -right-5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-neutral-700 lg:block"
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </div>
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
    <div className={panelClass + " min-w-0 rounded-xl p-4 md:p-5"}>
      <div className="mb-4 flex flex-col gap-3 border-b border-neutral-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
            <Code2 className="h-4 w-4" aria-hidden="true" />
            Verify callback token
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Choose your backend and copy the callback handler.
          </p>
        </div>

        <div className="relative w-full sm:w-56">
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="h-10 w-full appearance-none rounded-lg border border-neutral-800 bg-neutral-950 px-3 pr-10 text-sm font-medium text-neutral-200 outline-none transition hover:border-neutral-700 focus:border-neutral-500"
            aria-label="Choose code language"
          >
            {(Object.keys(languageLabels) as Language[]).map((item) => (
              <option key={item} value={item}>
                {languageLabels[item]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
        </div>
      </div>

      <CodeBlock
        code={code}
        copied={copiedLanguage === language}
        onCopy={() => void copyCode()}
      />
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <section className="border-b border-neutral-900 px-4 py-10 md:px-8 md:py-16">
        <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-500">
              <Network className="h-3.5 w-3.5" aria-hidden="true" />
              Local OAuth for development
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white md:text-5xl">
              OAuth redirects for private IP backends.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400">
              Reverse HTTP verifies Google or GitHub OAuth, signs the user payload
              with your secret, then redirects the browser to your local callback.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Private callback", "Signed payload", "Your auth logic"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs font-medium text-neutral-300"
                  >
                    <CheckCircle2 className="mr-2 inline h-3.5 w-3.5 text-emerald-300" />
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          <div className={panelClass + " min-w-0 rounded-xl p-5"}>
            <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
                <Terminal className="h-4 w-4" aria-hidden="true" />
                redirect contract
              </div>
              <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-500">
                browser
              </span>
            </div>
            <CodeBlock
              code={`GET /oauth/google?client_id=<route_id>
GET /oauth/github?client_id=<route_id>

302 http://192.168.1.44:3030/oauth/google?token=<signed_jwt>`}
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-7xl min-w-0">
          <SectionTitle
            icon={<Route className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Flow"
            title="One public OAuth callback, one private backend callback"
            text="Provider redirects stay on the platform. Your app receives a signed payload at the callback route you registered."
          />
          <FlowDiagram />
        </div>
      </section>

      <section className="border-y border-neutral-900 bg-neutral-950 px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="min-w-0">
            <SectionTitle
              icon={<KeyRound className="h-3.5 w-3.5" aria-hidden="true" />}
              label="Setup"
              title="Create one route in the console"
              text="Users only need a callback endpoint and client secret. The platform stores the route and gives back the id used by the OAuth login URL."
            />
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            {setupSteps.map((step, index) => (
              <div key={step.title} className={softPanel + " min-w-0 p-4"}>
                <p className="font-mono text-xs text-neutral-600">0{index + 1}</p>
                <h3 className="mt-3 text-sm font-semibold text-neutral-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  {step.text}
                </p>
              </div>
            ))}

            <div className={softPanel + " min-w-0 p-4 md:col-span-3"}>
              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">Callback endpoint</p>
                  <p className="mt-2 break-all font-mono text-sm text-neutral-200">
                    http://192.168.1.44:3030/oauth/google
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">OAuth start URL</p>
                  <p className="mt-2 break-all font-mono text-sm text-neutral-200">
                    /oauth/google?client_id=&lt;route_id&gt;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-7xl min-w-0">
          <SectionTitle
            icon={<Braces className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Payload"
            title="What your backend receives"
            text="The token is signed with your client secret. After verification, these are the fields your custom flow should use."
          />

          <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className={panelClass + " min-w-0 rounded-xl p-5"}>
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-100">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                Signed fields
              </div>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                {payloadFields.map((field) => (
                  <div
                    key={field.key}
                    className="min-w-0 rounded-lg border border-neutral-800 bg-neutral-950 p-3"
                  >
                    <p className="font-mono text-xs text-sky-300">{field.key}</p>
                    <p className="mt-1 text-xs font-medium text-neutral-200">
                      {field.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={panelClass + " min-w-0 rounded-xl p-5"}>
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-100">
                <Code2 className="h-4 w-4" aria-hidden="true" />
                Decoded payload shape
              </div>
              <CodeBlock code={samplePayload} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-900 bg-neutral-950 px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-7xl min-w-0">
          <SectionTitle
            icon={<Github className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Examples"
            title="Verify the callback in your backend"
            text="Select a language, copy the handler, and replace the route path with the callback endpoint you registered."
          />
          <LanguageCodePanel />
        </div>
      </section>
    </main>
  );
}

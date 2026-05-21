import { Link } from "react-router-dom";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  CloudCog,
  Code2,
  Github,
  Globe2,
  KeyRound,
  LockKeyhole,
  Network,
  Route,
  ShieldCheck,
  Smartphone,
  Terminal,
} from "lucide-react";

const panelClass =
  "border border-neutral-800 bg-neutral-900/70 shadow-2xl shadow-black/20";

const primaryLink =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-neutral-100 px-5 text-sm font-semibold text-neutral-950 transition hover:bg-white";

const secondaryLink =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-5 text-sm font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white";

const features = [
  {
    icon: <Braces className="h-4 w-4" aria-hidden="true" />,
    title: "Startup config endpoint",
    text: "Serve app JSON at launch so mobile and web clients can discover the latest backend URL without shipping a new build.",
  },
  {
    icon: <Route className="h-4 w-4" aria-hidden="true" />,
    title: "Reverse HTTP routing",
    text: "Point public callbacks at your local or dockerized services while you keep full control of backend behavior.",
  },
  {
    icon: <LockKeyhole className="h-4 w-4" aria-hidden="true" />,
    title: "OAuth handoff control",
    text: "Use Google and GitHub callback flows from localhost, then let your backend decide how tokens are returned.",
  },
];

const flowSteps = [
  "RN app boots",
  "Fetch config JSON",
  "Resolve live backend",
  "Send request",
];

function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute left-1/2 top-28 w-[min(980px,92vw)] -translate-x-1/2">
        <div className="grid gap-3 opacity-45 md:grid-cols-[1fr_1.2fr_1fr]">
          <div className="hidden rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 md:block">
            <div className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              app startup
            </div>
            <div className="space-y-2 font-mono text-[11px] text-neutral-500">
              <p>GET /app/config/mobile</p>
              <p className="text-emerald-300">200 baseUrl updated</p>
              <p>api: 192.168.1.42</p>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/90 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <CloudCog className="h-3.5 w-3.5" aria-hidden="true" />
                control plane
              </div>
              <span className="rounded-full border border-emerald-900/70 bg-emerald-950/40 px-2 py-0.5 text-[10px] text-emerald-200">
                live
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-[10px] text-neutral-600">Config keys</p>
                <p className="mt-1 text-xl font-semibold text-neutral-100">14</p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-[10px] text-neutral-600">OAuth routes</p>
                <p className="mt-1 text-xl font-semibold text-neutral-100">03</p>
              </div>
            </div>
          </div>
          <div className="hidden rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 lg:block">
            <div className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              oauth callback
            </div>
            <div className="space-y-2 font-mono text-[11px] text-neutral-500">
              <p>github.com/login/oauth</p>
              <p className="text-sky-300">redirect /oauth/callback</p>
              <p className="text-emerald-300">token returned</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <HeroVisual />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col justify-center px-4 py-16 md:px-8">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-3 py-1 text-xs text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Config delivery and localhost OAuth for real apps
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Reverse HTTP for apps that move faster than their backend URLs.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
            Serve boot-time config JSON, update changing local IPs in one place,
            and route OAuth callbacks from Google or GitHub back to your own backend.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/app" className={primaryLink}>
              Manage app configs
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/oauth" className={secondaryLink}>
              Set up OAuth routes
              <Route className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-4">
          {flowSteps.map((step, index) => (
            <div
              key={step}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4"
            >
              <p className="text-xs text-neutral-600">0{index + 1}</p>
              <p className="mt-2 text-sm font-medium text-neutral-100">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platform() {
  return (
    <section id="platform" className="border-y border-neutral-900 bg-neutral-950 py-16 md:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            One small control plane, two practical jobs.
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Keep app startup configuration and OAuth reverse routing in the same
            console instead of scattering local URLs, tokens, and callback paths.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className={panelClass + " rounded-xl p-5"}>
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-neutral-100">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-500">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section id="workflow" className="bg-neutral-950 py-16 md:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-500">
            <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            Runtime flow
          </div>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Change the backend once, every app reads the new value.
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            When a dockerized service moves to a new local IP, update the config
            in the platform. Your RN app or website fetches fresh JSON at startup
            and uses that endpoint for future requests.
          </p>
        </div>

        <div className={panelClass + " rounded-xl p-5"}>
          <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
              <Code2 className="h-4 w-4" aria-hidden="true" />
              boot-config.json
            </div>
            <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-500">
              startup
            </span>
          </div>
          <pre className="overflow-auto rounded-lg border border-neutral-800 bg-black p-4 font-mono text-xs leading-6 text-neutral-400">
            <code>
{`{
  "apiBaseUrl": "http://192.168.1.42:4000",
  "oauthRedirect": "https://reverse.local/oauth/callback",
  "features": {
    "githubLogin": true,
    "googleLogin": true
  }
}`}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section id="use-cases" className="bg-neutral-950 pb-16 md:pb-24">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 md:grid-cols-2 md:px-8">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-100">
            Mobile apps with changing local backends
          </h3>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Avoid rebuilding the app every time your dockerized backend moves.
            Keep the current base URL in a server-side config record.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300">
            <Network className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-100">
            OAuth callbacks while developing locally
          </h3>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Let providers redirect to this service, forward the useful request to
            your backend, and keep token handling under your backend control.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-900 bg-neutral-950 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 text-sm text-neutral-600 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2 text-neutral-400">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Reverse HTTP
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to="/app" className="transition hover:text-neutral-300">
            Config console
          </Link>
          <Link to="/oauth" className="transition hover:text-neutral-300">
            OAuth routing
          </Link>
        </div>
      </div>
    </footer>
  );
}

const LandingPage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100 selection:bg-neutral-200 selection:text-neutral-950">
      <main>
        <Hero />
        <Platform />
        <Workflow />
        <UseCases />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;

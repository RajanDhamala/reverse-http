import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Braces,
  CheckCircle2,
  Chrome,
  DatabaseZap,
  FileCode2,
  Github,
  Grid2X2,
  LockKeyhole,
  PanelsTopLeft,
  Radio,
  Route,
  Server,
  ShieldCheck,
  Terminal,
  Wifi,
} from "lucide-react";
import { frontendAddress } from "../Utils/env";

const releaseNotes = [
  "Stream OAuth route traffic through /oauth/live?client_id=:route.",
  "Watch provider redirects, callbacks, and signed handoffs as they happen.",
  "Keep the latest 200 route events in a browser-native terminal view.",
];

const liveTrafficRows = [
  { time: "14:22:01.118", provider: "github", method: "GET", endpoint: "/oauth/github?client_id=rh_live", tone: "text-cyan-300" },
  { time: "14:22:01.241", provider: "github", method: "302", endpoint: "redirect_provider github.com/login/oauth", tone: "text-amber-300" },
  { time: "14:22:04.903", provider: "github", method: "CALLBACK", endpoint: "/oauth/callback/github", tone: "text-sky-300" },
  { time: "14:22:04.947", provider: "route", method: "OK", endpoint: "signed handoff to localhost:4000/callback", tone: "text-emerald-300" },
  { time: "14:22:06.332", provider: "google", method: "GET", endpoint: "/oauth/google?client_id=rh_live", tone: "text-cyan-300" },
  { time: "14:22:06.419", provider: "stream", method: "EVENT", endpoint: "pushed to live dashboard listener", tone: "text-fuchsia-300" },
];

const dashboardStats = [
  { label: "events", value: "128", icon: <Activity className="h-4 w-4" aria-hidden="true" /> },
  { label: "latency", value: "42ms", icon: <DatabaseZap className="h-4 w-4" aria-hidden="true" /> },
  { label: "status", value: "LIVE", icon: <Wifi className="h-4 w-4" aria-hidden="true" /> },
];

const features = [
  {
    icon: <Braces className="h-4 w-4" aria-hidden="true" />,
    title: "Startup config endpoint",
    text: "Mobile and web clients fetch live JSON at launch instead of carrying stale IPs in builds.",
  },
  {
    icon: <Route className="h-4 w-4" aria-hidden="true" />,
    title: "Private callback routing",
    text: "OAuth providers hit the public service, then your local backend receives the signed handoff.",
  },
  {
    icon: <LockKeyhole className="h-4 w-4" aria-hidden="true" />,
    title: "Route-owned secrets",
    text: "Each callback route signs its payload with the secret your backend already knows.",
  },
];

function LiveDashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative min-w-0 overflow-hidden rounded-xl border border-[#232832] bg-[#10131a] shadow-2xl shadow-slate-950/25"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-[#151922] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-slate-400">
            <Radio className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
            <span className="truncate">GET /oauth/live?client_id=rh_live</span>
          </div>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2 font-mono text-xs text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-300">
            <motion.span
              className="block h-2 w-2 rounded-full bg-emerald-300"
              animate={{ opacity: [0.7, 0], scale: [1, 2.5] }}
              transition={{ duration: 1.35, repeat: Infinity, ease: "easeOut" }}
            />
          </span>
          LIVE
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-white/[0.03] p-4 lg:border-b-0 lg:border-r">
          <p className="font-mono text-[11px] font-semibold uppercase text-slate-500">Route</p>
          <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="break-all font-mono text-xs text-slate-300">rh_live_8f42</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Github className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              <Chrome className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              <span>providers armed</span>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-mono text-[11px] uppercase">{stat.label}</span>
                  <span className="text-cyan-300">{stat.icon}</span>
                </div>
                <p className="mt-2 font-mono text-lg font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-3">
            {[
              { label: "public hit", icon: <Server className="h-4 w-4" aria-hidden="true" /> },
              { label: "provider auth", icon: <Github className="h-4 w-4" aria-hidden="true" /> },
              { label: "local callback", icon: <Terminal className="h-4 w-4" aria-hidden="true" /> },
            ].map((node, index) => (
              <div key={node.label} className="relative rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                  <span className="text-cyan-300">{node.icon}</span>
                  {node.label}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-cyan-300"
                    animate={{ x: ["-100%", "0%", "100%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.35, ease: "easeInOut" }}
                  />
                </div>
                {index < 2 ? (
                  <ArrowRight className="absolute -right-5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-500 sm:block" aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="h-[340px] overflow-hidden px-3 py-3 font-mono text-[12px] leading-6 sm:px-4">
            {liveTrafficRows.map((row, index) => (
              <motion.div
                key={`${row.time}-${row.endpoint}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: [0.45, 1, 1, 0.7], y: 0 }}
                transition={{ duration: 3.6, repeat: Infinity, delay: index * 0.42, repeatDelay: 1.8 }}
                className="grid min-w-0 grid-cols-[74px_68px_76px_minmax(0,1fr)] gap-3 border-b border-white/5 py-2 last:border-b-0"
              >
                <span className="truncate text-slate-500">{row.time}</span>
                <span className="truncate text-slate-500">[{row.provider}]</span>
                <span className={`font-semibold ${row.tone}`}>{row.method}</span>
                <span className="min-w-0 truncate text-slate-100">"{row.endpoint}"</span>
              </motion.div>
            ))}

            <div className="flex items-center gap-3 py-4 text-slate-500">
              <motion.span
                className="h-4 w-4 rounded-full border-2 border-slate-700 border-t-cyan-300"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span>Waiting for the next OAuth event...</span>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="pointer-events-none absolute inset-x-0 top-14 h-px bg-cyan-300/40"
        animate={{ y: [0, 430], opacity: [0, 0.8, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

function BrowserWindow() {
  return (
    <div className="browser-shell overflow-hidden rounded-2xl">
      <div className="browser-bar flex items-center gap-3 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-3">
          <Chrome className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" />
          <span className="truncate font-mono text-xs text-gray-500">
            {frontendAddress("/oauth/live")}
          </span>
        </div>
        <span className="rounded-md border border-cyan-200 bg-cyan-50 p-1.5 text-cyan-600">
          <PanelsTopLeft className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="grid-canvas relative overflow-hidden p-5 sm:p-8 lg:p-10">
        <div className="grid min-h-[650px] gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <div className="status-pill mb-8 w-max">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live route monitor
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.92] tracking-normal text-gray-950 sm:text-6xl lg:text-7xl">
              Reverse HTTP
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-gray-600">
              Ship startup config and OAuth callbacks through a public route, then
              watch every provider hit, redirect, callback, and local handoff in real time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/app" className="dev-button dev-button-primary">
                <Chrome className="h-4 w-4" aria-hidden="true" />
                Open Configs
              </Link>
              <Link to="/oauth" className="dev-button">
                <Radio className="h-4 w-4" aria-hidden="true" />
                Monitor OAuth
              </Link>
              <Link to="/docs" className="dev-button">
                <Terminal className="h-4 w-4" aria-hidden="true" />
                Read Docs
              </Link>
            </div>
            <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["SSE logs", "live browser stream"],
                ["200 rows", "rolling terminal buffer"],
                ["OAuth", "public to localhost"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-white/75 p-3">
                  <p className="font-mono text-[11px] uppercase text-gray-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <LiveDashboardPreview />
        </div>

        <div className="mt-8 grid border border-gray-200 bg-white/86 backdrop-blur md:grid-cols-[280px_1fr]">
          <div className="border-r border-gray-200 p-6">
            <p className="font-mono text-xs font-semibold uppercase text-gray-400">
              Live traffic
            </p>
            <h2 className="mt-2 text-xl font-semibold text-gray-950">
              Your public OAuth route now has an observability surface.
            </h2>
          </div>
          <div className="space-y-3 p-6">
            {releaseNotes.map((note) => (
              <p key={note} className="font-mono text-xs leading-6 text-gray-600">
                <span className="mr-2 text-cyan-500">+</span>
                {note}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspacePreview() {
  return (
    <section className="px-4 py-16 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <span className="status-pill">Workspace</span>
          <h2 className="mt-4 text-3xl font-semibold text-gray-950">
            Built like a browser tool, not a generic SaaS dashboard.
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Dense where it should be dense: routes, config IDs, payload keys,
            callback URLs, and copy actions are all first-class interface objects.
          </p>
        </div>

        <div className="browser-shell grid overflow-hidden rounded-2xl lg:grid-cols-[240px_1fr_320px]">
          <aside className="border-b border-gray-200 bg-gray-50 p-4 lg:border-b-0 lg:border-r">
            <p className="dev-label">Explorer</p>
            {["app_configs", "oauth_routes", "client_secrets", "docs"].map((item) => (
              <div key={item} className="mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-600">
                <Grid2X2 className="h-3.5 w-3.5 text-cyan-500" />
                {item}
              </div>
            ))}
            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-3">
              <p className="font-mono text-[11px] text-gray-400">shortcuts</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["C", "R", "JSON", "COPY"].map((key) => (
                  <kbd key={key} className="mono-chip">{key}</kbd>
                ))}
              </div>
            </div>
          </aside>

          <div className="grid-canvas min-h-[420px] p-4 sm:p-6">
            <div className="chrome-card-strong mx-auto mt-6 max-w-xl rounded-xl p-4 sm:mt-10 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-cyan-600">GET /app/config/mobile</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-950">boot-config.json</h3>
                </div>
                <CheckCircle2 className="h-5 w-5 text-cyan-500" />
              </div>
              <pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-6 text-gray-600">
{`{
  "apiBaseUrl": "http://192.168.1.42:4000",
  "oauth": "enabled",
  "provider": ["github", "google"]
}`}
              </pre>
            </div>
          </div>

          <aside className="border-t border-gray-200 bg-white p-4 lg:border-l lg:border-t-0">
            <p className="dev-label">Inspector</p>
            {features.map((feature) => (
              <div key={feature.title} className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <span className="text-cyan-600">{feature.icon}</span>
                  {feature.title}
                </div>
                <p className="text-xs leading-5 text-gray-600">{feature.text}</p>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}

function ReadmeBlock() {
  return (
    <section className="px-4 pb-16 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="code-window">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <span className="font-mono text-xs text-gray-400">README.md</span>
            <FileCode2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="grid gap-8 p-5 md:grid-cols-[0.8fr_1.2fr] md:p-8">
            <div>
              <p className="font-mono text-sm text-cyan-300"># Reverse HTTP</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Serve config. Bridge OAuth. Keep your app moving.
              </h2>
            </div>
            <div className="space-y-3 font-mono text-sm leading-7 text-gray-300">
              <p><span className="text-cyan-300">GET</span> /app/config/:id</p>
              <p><span className="text-cyan-300">GET</span> /oauth/github?client_id=:route</p>
              <p><span className="text-cyan-300">SSE</span> /oauth/listen/:route</p>
              <p><span className="text-cyan-300">302</span> http://192.168.x.x/callback?token=jwt</p>
              <div className="mt-5 rounded-lg border border-gray-800 bg-black/30 p-4 text-xs">
                npm run dev
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <main className="app-page grid-canvas overflow-x-hidden">
      <section className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <BrowserWindow />
        </div>
      </section>
      <WorkspacePreview />
      <ReadmeBlock />
      <footer className="border-t border-gray-200 bg-white/80 px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <ShieldCheck className="h-4 w-4 text-cyan-500" />
            Reverse HTTP
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="hover:text-cyan-700">Config console</Link>
            <Link to="/oauth" className="hover:text-cyan-700">OAuth routing</Link>
            <Link to="/oauth/live" className="hover:text-cyan-700">Live dashboard</Link>
            <Link to="/docs" className="hover:text-cyan-700">Docs</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Chrome,
  Copy,
  Github,
  LoaderCircle,
  Radio,
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

type OAuthProvider = "github" | "google" | "stream";
type StreamState = "connecting" | "live" | "reconnecting" | "closed" | "missing";

interface OAuthStreamEvent {
  provider: OAuthProvider;
  phase: string;
  endpoint: string;
  route_id: string;
  time: string;
}

const baseURL = "http://localhost:3000";
const maxLogRows = 200;

const phaseLabels: Record<string, string> = {
  connected: "STREAM",
  login_hit: "GET",
  redirect_provider: "REDIRECT",
  callback_hit: "CALLBACK",
  success: "OK",
  failed: "ERR",
  closed: "CLOSE",
};

function formatLogTime(value: string) {
  if (!value) return "--:--:--.---";

  const date = new Date(value);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  return `${time}.${date.getMilliseconds().toString().padStart(3, "0")}`;
}

function pushLogRow(current: OAuthStreamEvent[], event: OAuthStreamEvent) {
  return [...current, event].slice(-maxLogRows);
}

function publicProviderUrl(provider: "github" | "google", routeID: string) {
  return `${baseURL}/oauth/${provider}?client_id=${encodeURIComponent(routeID)}`;
}

export default function OAuthLiveDashboard() {
  const [searchParams] = useSearchParams();
  const routeID = searchParams.get("client_id") || searchParams.get("id") || "";
  const shortRouteID = routeID ? routeID.slice(0, 8) : "missing";
  const [streamState, setStreamState] = useState<StreamState>(routeID ? "connecting" : "missing");
  const [events, setEvents] = useState<OAuthStreamEvent[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!routeID) return;

    const source = new EventSource(`${baseURL}/oauth/listen/${routeID}`, {
      withCredentials: true,
    });

    source.onopen = () => setStreamState("live");
    source.onerror = () => setStreamState(source.readyState === EventSource.CLOSED ? "closed" : "reconnecting");

    source.addEventListener("oauth", (event) => {
      const parsed = JSON.parse(event.data) as OAuthStreamEvent;
      setStreamState(parsed.phase === "closed" ? "closed" : "live");
      setEvents((current) => pushLogRow(current, parsed));
    });

    return () => {
      source.close();
      setStreamState("closed");
    };
  }, [routeID]);

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [events]);

  const copyText = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const streamCopy = streamState === "live"
    ? "LIVE"
    : streamState === "reconnecting"
      ? "RECONNECTING"
      : streamState === "closed"
        ? "CLOSED"
        : streamState === "missing"
          ? "NO ROUTE"
          : "CONNECTING";

  const latestEvent = events.at(-1);

  return (
    <main className="app-page grid-canvas min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col gap-5">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-cyan-700 shadow-sm">
              <Radio className="h-3.5 w-3.5" />
              Route listener
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-gray-950 sm:text-4xl">
              Live OAuth route console
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Keep this open while users hit the public provider URLs. The browser keeps only the newest {maxLogRows} rows.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!routeID}
              onClick={() => void copyText(publicProviderUrl("github", routeID), "github")}
              className="dev-button dev-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Github className="h-4 w-4" />
              {copied === "github" ? "Copied" : "Copy GitHub URL"}
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!routeID}
              onClick={() => void copyText(publicProviderUrl("google", routeID), "google")}
              className="dev-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Chrome className="h-4 w-4 text-cyan-600" />
              {copied === "google" ? "Copied" : "Copy Google URL"}
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="browser-shell overflow-hidden rounded-xl bg-white">
            <div className="browser-bar flex items-center gap-3 px-4 py-3">
              <Terminal className="h-4 w-4 text-cyan-600" />
              <span className="font-mono text-xs font-semibold text-gray-600">listener status</span>
            </div>
            <div className="space-y-4 p-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="dev-label mb-2">Connection</p>
                <div className="flex items-center gap-2 font-mono text-sm font-semibold text-gray-950">
                  {streamState === "closed" || streamState === "missing" ? <WifiOff className="h-4 w-4 text-rose-500" /> : <Wifi className="h-4 w-4 text-cyan-600" />}
                  {streamCopy}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="dev-label mb-2">OAuth Route</p>
                <p className="break-all font-mono text-xs text-gray-700">{routeID || "Open from an OAuth route"}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="dev-label mb-2">Rows</p>
                <p className="font-mono text-sm font-semibold text-gray-950">
                  {events.length}/{maxLogRows}
                </p>
              </div>

              {!routeID ? (
                <Link to="/oauth" className="dev-button dev-button-primary w-full">
                  Back to OAuth Routes
                </Link>
              ) : null}
            </div>
          </aside>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="min-w-0 overflow-hidden rounded-xl border border-[#24242c] bg-[#141419] shadow-2xl shadow-slate-900/20"
          >
            <div className="flex items-center justify-between border-b border-[#25252d] bg-[#17171d] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-slate-400">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="truncate">GET /oauth/listen/{shortRouteID}</span>
                </div>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-2 font-mono text-xs text-slate-500">
                <span className={`h-2 w-2 rounded-full ${streamState === "live" ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`} />
                {latestEvent ? phaseLabels[latestEvent.phase] || latestEvent.phase.toUpperCase() : streamCopy}
              </div>
            </div>

            <div ref={logRef} className="h-[min(68vh,680px)] overflow-y-auto overflow-x-hidden px-3 py-3 font-mono text-[12px] leading-5 sm:px-4 sm:text-[13px] sm:leading-6">
              {events.map((event, index) => {
                const method = phaseLabels[event.phase] || event.phase.toUpperCase();
                const isError = event.phase === "failed";
                const isSuccess = event.phase === "success";

                return (
                  <motion.div
                    key={`${event.time}-${event.phase}-${index}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[#22222a] py-2 last:border-b-0 md:grid-cols-[112px_160px_78px_minmax(0,1fr)] md:gap-4 md:py-1.5"
                  >
                    <span className="min-w-0 truncate text-slate-500">{formatLogTime(event.time)}</span>
                    <span className="min-w-0 truncate text-right text-slate-500 md:text-left">[{event.provider} {shortRouteID}]</span>
                    <span className={isError ? "font-semibold text-rose-400" : isSuccess ? "font-semibold text-emerald-400" : "font-semibold text-cyan-400"}>
                      {method}
                    </span>
                    <span className="col-span-2 min-w-0 break-words text-slate-100 md:col-span-1">
                      "{event.endpoint}" "{event.phase}"
                    </span>
                  </motion.div>
                );
              })}

              <div className="flex items-center gap-3 py-3 text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Waiting for logs to be received...</span>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

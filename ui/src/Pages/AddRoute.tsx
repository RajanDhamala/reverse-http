import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Edit, Globe2, KeyRound, Loader2, Network, Plus, Route, Save, Search, ServerCog, Settings2, ShieldCheck, Tag, X } from "lucide-react";

interface ReverseHttpReq {
  client_secret: string;
  name: string;
  endpoint: string;
}

interface Config {
  id: string;
  key: string;
  endpoint: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

interface EditState {
  client_secret?: string;
  id: string;
  key: string;
  endpoint: string;
}

type Notice = { type: "success" | "error"; text: string } | null;

const BASE = "http://localhost:3000";

const fieldClass =
  "w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 font-mono text-sm text-neutral-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-neutral-700 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-600/20";

const labelClass =
  "mb-2 flex items-center gap-2 text-xs font-medium text-neutral-500";

const panelClass =
  "border border-neutral-800 bg-neutral-900/70 shadow-2xl shadow-black/20";

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

async function createReverseRoute(payload: ReverseHttpReq) {
  const response = await fetch(`${BASE}/reverse-http/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || "Failed to create route");
  return data;
}

async function fetchReverseConfigs(): Promise<Config[]> {
  const response = await fetch(`${BASE}/reverse-http/list`, {
    credentials: "include",
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || "Failed to load configs");
  return Array.isArray(data.data) ? data.data : [];
}

async function updateReverseConfig(payload: EditState) {
  const response = await fetch(`${BASE}/reverse-http/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || "Failed to update config");
  return data;
}

function shortId(id: string) {
  if (!id) return "No id";
  return id.length > 10 ? `${id.slice(0, 8)}..` : id;
}

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const isSuccess = notice.type === "success";

  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg shadow-black/20 ${isSuccess
        ? "border-neutral-700 bg-neutral-900 text-neutral-100"
        : "border-red-950/70 bg-red-950/20 text-red-200"
        }`}
      role="status"
      aria-live="polite"
    >
      {isSuccess ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="break-all">{notice.text}</span>
    </div>
  );
}

const AddRoute = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [editedConfig, setEditConfig] = useState<EditState>({
    id: "",
    key: "",
    endpoint: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const configsQuery = useQuery({
    queryKey: ["reverse-http-list"],
    queryFn: fetchReverseConfigs,
  });

  const createRouteMutation = useMutation({
    mutationFn: createReverseRoute,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["reverse-http-list"] });
      setNotice({
        type: "success",
        text: `Route created successfully${data.route_id ? `: ${data.route_id}` : ""}`,
      });
      setName("");
      setEndpoint("");
      setClientSecret("");
    },
    onError: (error) => {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create route",
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: updateReverseConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reverse-http-list"] });
      setIsEditing(false);
      setNotice({ type: "success", text: "Configuration saved" });
      window.setTimeout(() => setNotice(null), 2500);
    },
    onError: (error) => {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update config",
      });
    },
  });

  const configs = configsQuery.data ?? [];
  const endpointCount = configs.filter((item) => item.endpoint).length;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const trimmedName = name.trim();
    const trimmedEndpoint = endpoint.trim();
    if (!trimmedName || !trimmedEndpoint) {
      setNotice({ type: "error", text: "Route name and endpoint are required" });
      return;
    }

    createRouteMutation.mutate({
      name: trimmedName,
      endpoint: trimmedEndpoint,
      client_secret: clientSecret.trim(),
    });
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 px-4 py-6 text-neutral-100 md:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 border-b border-neutral-900 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-500">
              <ServerCog className="h-3.5 w-3.5" aria-hidden="true" />
              Reverse HTTP control plane
            </div>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              OAuth Reverse HTTP
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Create and manage the reverse HTTP routes used by OAuth redirect flows.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
            <div className={panelClass + " rounded-xl p-4"}>
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400">
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-xs text-neutral-500">Configs</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-100">
                {configs.length}
              </p>
            </div>
            <div className={panelClass + " rounded-xl p-4"}>
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400">
                <Globe2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-xs text-neutral-500">Endpoints</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-100">
                {endpointCount}
              </p>
            </div>
          </div>
        </div>

        <NoticeBanner notice={notice} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
          <div className={panelClass + " rounded-xl p-5 md:p-6"}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300">
                <Route className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-100">
                  Route setup
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Name the route and point it at the internal callback endpoint.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  Route name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="my-oauth-service"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Private endpoint
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                  placeholder="http://192.168.x.x:3000/oauth/callback"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  Client secret
                </label>
                <input
                  type="text"
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  placeholder="secrete key"
                  className={fieldClass}
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-400">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-neutral-100">OAuth ready</p>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  This route becomes the reverse HTTP target used by redirect flows.
                </p>

                <button
                  type="submit"
                  disabled={createRouteMutation.isPending}
                  className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createRouteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  {createRouteMutation.isPending ? "Creating" : "Create route"}
                </button>
              </div>
            </form>
          </div>

          <div className={panelClass + " rounded-xl p-5 md:p-6"}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300">
                  <Network className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-100">
                    Proxy registry
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    {configs.length} records loaded from the API
                  </p>
                </div>
              </div>
            </div>

            {configsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 py-12 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading configurations
              </div>
            ) : configsQuery.isError ? (
              <div className="rounded-lg border border-red-950/70 bg-red-950/20 px-6 py-10 text-center text-red-200">
                <AlertCircle className="mx-auto h-8 w-8" aria-hidden="true" />
                <p className="mt-4 text-sm font-medium">Failed to load configs</p>
                <button
                  type="button"
                  onClick={() => void configsQuery.refetch()}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-red-900/70 bg-red-950/30 px-3 text-xs font-medium text-red-100 transition hover:border-red-700"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </button>
              </div>
            ) : configs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950 px-6 py-12 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-neutral-700" aria-hidden="true" />
                <p className="mt-4 text-sm font-medium text-neutral-300">
                  No configurations found
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-neutral-800">
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-3 text-xs text-neutral-500 md:grid">
                  <span>Key</span>
                  <span>Endpoint</span>
                  <span>Identifier</span>
                  <span>Action</span>
                </div>

                <div className="divide-y divide-neutral-800">
                  {configs.map((item) => {
                    const label = item.key || item.name || "Unnamed";

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 bg-neutral-900 px-4 py-4 transition hover:bg-neutral-900/60 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_auto] md:items-center"
                      >
                        <div className="col-span-2 min-w-0 md:col-span-1">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-500">
                              <KeyRound className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-neutral-100">
                                {label}
                              </p>
                              <p className="mt-0.5 text-xs text-neutral-600">
                                OAuth redirect target
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 min-w-0 md:col-span-1">
                          <p className="truncate font-mono text-xs text-neutral-400">
                            {item.endpoint || "No endpoint"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <span
                            className="inline-flex max-w-full items-center rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-500"
                            title={item.id}
                          >
                            <span className="truncate">{shortId(item.id)}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null);
                            setEditConfig({
                              id: item.id,
                              key: item.key || item.name || "",
                              endpoint: item.endpoint || "",
                            });
                            setIsEditing(true);
                          }}
                          className="inline-flex h-9 items-center justify-center gap-2 justify-self-end rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsEditing(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl shadow-black/40">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300">
                  <Edit className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-100">
                    Edit configuration
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Update the key or private endpoint.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-500 transition hover:border-neutral-600 hover:text-white"
                aria-label="Close edit modal"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  API key
                </label>
                <input
                  type="text"
                  value={editedConfig.key}
                  onChange={(event) =>
                    setEditConfig({ ...editedConfig, key: event.target.value })
                  }
                  placeholder="Enter API key"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Endpoint
                </label>
                <input
                  type="text"
                  value={editedConfig.endpoint}
                  onChange={(event) =>
                    setEditConfig({ ...editedConfig, endpoint: event.target.value })
                  }
                  placeholder="http://192.168.x.x:3000/oauth/callback"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2 border-t border-neutral-800 pt-4">
              <button
                type="button"
                onClick={() => updateConfigMutation.mutate(editedConfig)}
                disabled={updateConfigMutation.isPending}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateConfigMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {updateConfigMutation.isPending ? "Saving" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddRoute;

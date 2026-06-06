import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Chrome,
  Copy,
  Eye,
  EyeOff,
  Github,
  Globe2,
  KeyRound,
  Loader2,
  Network,
  Pencil,
  Plus,
  Route,
  ServerCog,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiUrl, oauthProviderUrl } from "../Utils/env";

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
  client_secret: string;
  id: string;
  key: string;
  endpoint: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

async function createReverseRoute(payload: ReverseHttpReq) {
  const response = await fetch(apiUrl("/reverse-http/add"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to create route");
  }
  return data;
}

async function fetchReverseConfigs(): Promise<Config[]> {
  const response = await fetch(apiUrl("/reverse-http/list"), {
    credentials: "include",
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to load configs");
  }

  return Array.isArray(data.data) ? data.data : [];
}

async function updateReverseConfig(payload: EditState) {
  const response = await fetch(apiUrl("/reverse-http/edit"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to update config");

  }
  return data;
}

async function fetchClientSecretById(id: string) {
  const response = await fetch(apiUrl(`/reverse-http/clientKey/${encodeURIComponent(id)}`), {
    credentials: "include",
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to load client secret");

  }
  const record = data.data || data.config || data;
  return {
    id,
    client_secret: record.client_secret || record.ClientSecret || "",
  };
}

async function deleteReverseConfig(id: string) {
  const response = await fetch(apiUrl(`/reverse-http/truncate/${encodeURIComponent(id)}`), {
    method: "DELETE",
    credentials: "include",
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || data.message || "Failed to delete config");
  }
  return data;
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id || "missing-id";
}

function MetricTile({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="metric-card">
      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700">
        {icon}
      </div>
      <p className="font-mono text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-950">{value}</p>
    </div>
  );
}

export default function AddRoute() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [secretVisible, setSecretVisible] = useState(false);
  const [editSecretVisible, setEditSecretVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<EditState>({
    id: "",
    key: "",
    endpoint: "",
    client_secret: "",
  });
  const [clientSecretDirty, setClientSecretDirty] = useState(false);

  const configsQuery = useQuery({
    queryKey: ["reverse-http-list"],
    queryFn: fetchReverseConfigs,
  });

  const clientSecretQuery = useQuery({
    queryKey: ["reverse-http-client-secret", editedConfig.id],
    queryFn: () => fetchClientSecretById(editedConfig.id),
    enabled: isEditing && Boolean(editedConfig.id),
    staleTime: Infinity,
  });

  const configs = configsQuery.data ?? [];
  const endpointCount = configs.filter((item) => item.endpoint).length;
  const secretValue = clientSecretDirty
    ? editedConfig.client_secret
    : clientSecretQuery.data?.client_secret ?? editedConfig.client_secret;

  useEffect(() => {
    if (configsQuery.error) {
      toast.error(getErrorMessage(configsQuery.error, "Failed to load routes"));
    }
  }, [configsQuery.error]);

  useEffect(() => {
    if (clientSecretQuery.error) {
      toast.error(getErrorMessage(clientSecretQuery.error, "Failed to load client secret"));
    }
  }, [clientSecretQuery.error]);

  const createRouteMutation = useMutation({
    mutationFn: createReverseRoute,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reverse-http-list"] });
      setName("");
      setEndpoint("");
      setClientSecret("");
      toast.success("Route created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create route"));
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: updateReverseConfig,
    onSuccess: (_data, updatedConfig) => {
      void queryClient.invalidateQueries({ queryKey: ["reverse-http-list"] });
      queryClient.setQueryData(["reverse-http-client-secret", updatedConfig.id], {
        id: updatedConfig.id,
        client_secret: updatedConfig.client_secret,
      });
      setIsEditing(false);
      setClientSecretDirty(false);
      toast.success("Route updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update route"));
    }
  });

  const deleteConfigMutation = useMutation({
    mutationFn: deleteReverseConfig,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Config[]>(["reverse-http-list"], (current) =>
        (current ?? []).filter((item) => item.id !== id)
      );
      void queryClient.invalidateQueries({ queryKey: ["reverse-http-list"] });
      toast.success("Route deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete route"));
    }
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEndpoint = endpoint.trim();
    if (!trimmedName || !trimmedEndpoint || !clientSecret.trim()) {
      toast.error("Route name, endpoint, and client secret are required");
      return;
    }
    createRouteMutation.mutate({
      name: trimmedName,
      endpoint: trimmedEndpoint,
      client_secret: clientSecret.trim(),
    });
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const startEditingConfig = (item: Config) => {
    const cachedClientSecret = queryClient.getQueryData<{ id: string; client_secret: string }>([
      "reverse-http-client-secret",
      item.id,
    ]);
    setEditedConfig({
      id: item.id,
      key: item.key || item.name || "",
      endpoint: item.endpoint || "",
      client_secret: cachedClientSecret?.client_secret ?? "",
    });
    setClientSecretDirty(false);
    setEditSecretVisible(false);
    setIsEditing(true);
  };

  const googleUrl = (id: string) => oauthProviderUrl("google", id);
  const githubUrl = (id: string) => oauthProviderUrl("github", id);

  return (
    <main className="app-page grid-canvas px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="status-pill">OAuth Reverse HTTP</span>
            <h1 className="mt-4 text-3xl font-semibold text-gray-950 md:text-4xl">OAuth Routes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Register private callback endpoints and copy provider start URLs for Google or GitHub.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:min-w-[300px]">
            <MetricTile label="Routes" value={String(configs.length)} icon={<Route className="h-4 w-4" />} />
            <MetricTile label="Endpoints" value={String(endpointCount)} icon={<Globe2 className="h-4 w-4" />} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="chrome-card-strong rounded-xl p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
                <ServerCog className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-950">Route setup</h2>
                <p className="mt-1 text-xs text-gray-500">Point public OAuth handoffs at your private callback.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="dev-label">Route name</label>
                <input value={name} onChange={(event) => setName(event.target.value)} className="dev-input" placeholder="my-oauth-service" />
              </div>
              <div>
                <label className="dev-label">Private endpoint</label>
                <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} className="dev-input font-mono text-xs" placeholder="http://192.168.x.x:3030/oauth/google" />
              </div>
              <div>
                <label className="dev-label">Client secret</label>
                <div className="relative">
                  <input
                    type={secretVisible ? "text" : "password"}
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                    className="dev-input pr-10 font-mono text-xs"
                    placeholder="shared signing secret"
                  />
                  <button
                    type="button"
                    onClick={() => setSecretVisible((current) => !current)}
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-cyan-700"
                    aria-label={secretVisible ? "Hide client secret" : "Show client secret"}
                  >
                    {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-cyan-700" />
                <p className="text-sm font-semibold text-gray-950">OAuth ready</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  The saved id becomes the `client_id` query value for provider login.
                </p>
              </div>
              <button type="submit" disabled={createRouteMutation.isPending} className="dev-button dev-button-primary w-full">
                {createRouteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create route
              </button>
            </form>
          </section>

          <section className="chrome-card-strong overflow-hidden rounded-xl">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <p className="dev-label mb-0">
                <Network className="h-3.5 w-3.5" />
                Route Registry
              </p>
            </div>

            {configsQuery.isLoading ? (
              <div className="flex items-center gap-3 p-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading routes
              </div>
            ) : configs.length === 0 ? (
              <div className="p-10 text-center">
                <Route className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-700">No routes yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {configs.map((item) => {
                  const label = item.key || item.name || "Unnamed route";
                  return (
                    <div key={item.id} className="grid gap-4 p-4 lg:grid-cols-[0.85fr_1.2fr_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-950">{label}</p>
                        <p className="mt-1 font-mono text-xs text-gray-400">{shortId(item.id)}</p>
                      </div>
                      <p className="min-w-0 truncate font-mono text-xs text-gray-600">{item.endpoint || "No endpoint"}</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void copyText(googleUrl(item.id), `google-${item.id}`)} className="dev-button h-9 min-h-9 px-3">
                          {copiedKey === `google-${item.id}` ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : <Chrome className="h-4 w-4" />}
                          Google
                        </button>
                        <button type="button" onClick={() => void copyText(githubUrl(item.id), `github-${item.id}`)} className="dev-button h-9 min-h-9 px-3">
                          {copiedKey === `github-${item.id}` ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : <Github className="h-4 w-4" />}
                          GitHub
                        </button>
                        <button type="button" onClick={() => { window.location.href = `/oauth/live?client_id=${encodeURIComponent(item.id)}`; }} className="dev-button h-9 min-h-9 px-3">
                          <Activity className="h-4 w-4" />
                          Live
                        </button>
                        <button type="button" onClick={() => startEditingConfig(item)} className="dev-button h-9 min-h-9 px-3">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => deleteConfigMutation.mutate(item.id)} className="dev-button dev-button-danger h-9 min-h-9 px-3">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {isEditing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsEditing(false);
          }}
        >
          <div className="chrome-card-strong w-full max-w-lg rounded-xl p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="dev-label mb-2">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Route
                </p>
                <h2 className="text-lg font-semibold text-gray-950">{editedConfig.key || "OAuth route"}</h2>
              </div>
              <button type="button" onClick={() => setIsEditing(false)} className="dev-button h-9 min-h-9 w-9 px-0" aria-label="Close edit modal">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="dev-label">API key</label>
                <input value={editedConfig.key} onChange={(event) => setEditedConfig({ ...editedConfig, key: event.target.value })} className="dev-input" />
              </div>
              <div>
                <label className="dev-label">Endpoint</label>
                <input value={editedConfig.endpoint} onChange={(event) => setEditedConfig({ ...editedConfig, endpoint: event.target.value })} className="dev-input font-mono text-xs" />
              </div>
              <div>
                <label className="dev-label">
                  <KeyRound className="h-3.5 w-3.5" />
                  Client secret
                </label>
                <div className="relative">
                  <input
                    type={editSecretVisible ? "text" : "password"}
                    value={secretValue}
                    onChange={(event) => {
                      setClientSecretDirty(true);
                      setEditedConfig({ ...editedConfig, client_secret: event.target.value });
                    }}
                    disabled={clientSecretQuery.isFetching}
                    className="dev-input pr-10 font-mono text-xs disabled:cursor-wait disabled:bg-gray-50"
                    placeholder={clientSecretQuery.isFetching ? "Loading client secret" : "Client secret"}
                  />
                  <button
                    type="button"
                    onClick={() => setEditSecretVisible((current) => !current)}
                    disabled={clientSecretQuery.isFetching}
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-cyan-700 disabled:cursor-wait"
                    aria-label={editSecretVisible ? "Hide client secret" : "Show client secret"}
                  >
                    {clientSecretQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : editSecretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => updateConfigMutation.mutate({ ...editedConfig, client_secret: secretValue })}
                disabled={updateConfigMutation.isPending || clientSecretQuery.isFetching}
                className="dev-button dev-button-primary flex-1"
              >
                {updateConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                Save changes
              </button>
              <button type="button" onClick={() => void copyText(googleUrl(editedConfig.id), `modal-${editedConfig.id}`)} className="dev-button px-3">
                {copiedKey === `modal-${editedConfig.id}` ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

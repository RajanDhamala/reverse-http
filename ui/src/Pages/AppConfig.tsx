import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Braces,
  CheckCircle2,
  Clipboard,
  Code2,
  Copy,
  Database,
  FileJson,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  Search,
  ServerCog,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiUrl } from "../Utils/env";

type Tab = "list" | "create" | "edit";
type EditorMode = "pairs" | "json";
type ConfigMap = Record<string, unknown>;
type ConfigPair = { key: string; value: string };
type ConfigPayload = {
  appConfig: string;
  endpoint: string;
  configs: unknown;
};
type UpdateConfigPayload = {
  id: string;
  app_name?: string;
  endpoint?: string;
  configs: unknown;
};
type ConfigRecord = {
  id?: string;
  ID?: string;
  app_name?: string;
  AppName?: string;
  appConfig?: string;
  endpoint?: string;
  Endpoint?: string;
  configs?: ConfigMap;
  Configs?: ConfigMap;
  config?: ConfigMap;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function req(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: unknown) {
  return fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

async function fetchAppConfigs(): Promise<ConfigRecord[]> {
  const response = await req("/app/allConfigs");
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to load configs");
  }
  const list: ConfigRecord[] = data.configs || data.data || [];
  return Array.isArray(list) ? list : [];
}

async function fetchAppConfigById(id: string): Promise<ConfigRecord> {
  const response = await req("/app/config/" + encodeURIComponent(id));
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to load configs");
  }
  return data.config || data.data || data;
}

async function createAppConfig(payload: ConfigPayload) {
  const response = await req("/app/init", "POST", payload);
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to create config");
  }
  return data;
}

async function updateAppConfig(payload: UpdateConfigPayload) {
  const response = await req("/app/update", "PATCH", payload);
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to update config");
  }
  return data;
}

async function deleteAppConfig(id: string) {
  const response = await req("/app/delete/" + encodeURIComponent(id), "DELETE");
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Failed to delete config");
  }
  return data;
}

function pickId(cfg: ConfigRecord) {
  return cfg.id ?? cfg.ID ?? "";
}

function pickName(cfg: ConfigRecord) {
  return cfg.app_name ?? cfg.AppName ?? cfg.appConfig ?? "Unnamed config";
}

function pickEndpoint(cfg: ConfigRecord) {
  return cfg.endpoint ?? cfg.Endpoint ?? "";
}

function pickConfigs(cfg: ConfigRecord): ConfigMap {
  return cfg.configs ?? cfg.Configs ?? cfg.config ?? {};
}

function getAppConfigUrl(id: string) {
  return apiUrl(`/app/config/${id}`);
}

function parseJsonObject(input: string) {
  const parsed = JSON.parse(input || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config must be a JSON object");
  }
  return parsed as ConfigMap;
}

function stringifyValue(value: unknown) {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function parseLooseValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed === "true" ||
    trimmed === "false" ||
    trimmed === "null" ||
    /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed) ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith('"')
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function pairsToConfig(pairs: ConfigPair[]) {
  const obj: ConfigMap = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (key) obj[key] = parseLooseValue(pair.value);
  }
  return obj;
}

function configToPairs(configs: ConfigMap): ConfigPair[] {
  const pairs = Object.entries(configs).map(([key, value]) => ({
    key,
    value: stringifyValue(value),
  }));
  return pairs.length > 0 ? pairs : [{ key: "", value: "" }];
}

function mergePairs(current: ConfigPair[], incoming: ConfigPair[]) {
  const next = [...current];
  for (const pair of incoming) {
    const key = pair.key.trim();
    if (!key) continue;
    const index = next.findIndex((item) => item.key.trim() === key);
    if (index >= 0) next[index] = { key, value: pair.value };
    else next.push({ key, value: pair.value });
  }
  return next.length > 0 ? next : [{ key: "", value: "" }];
}

function parseConfigInput(input: string): ConfigPair[] {
  const raw = input.trim();
  if (!raw) return [];

  try {
    const parsed = parseJsonObject(raw);
    return configToPairs(parsed);
  } catch {
    // Fall through to key=value or key: value parsing.
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("//"))
    .map((line) => line.replace(/,$/, ""))
    .map((line) => {
      const eq = line.indexOf("=");
      const colon = line.indexOf(":");
      const separator =
        eq >= 0 && colon >= 0 ? Math.min(eq, colon) : eq >= 0 ? eq : colon;
      if (separator <= 0) return null;
      const key = line.slice(0, separator).trim().replace(/^["']|["']$/g, "");
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      return key ? { key, value } : null;
    })
    .filter((pair): pair is ConfigPair => pair !== null);
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

function highlightJson(value: string) {
  const tokenRegex =
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const pieces: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(value))) {
    if (match.index > lastIndex) pieces.push(value.slice(lastIndex, match.index));
    const token = match[0];
    const className = token.endsWith(":")
      ? "text-cyan-300"
      : token.startsWith('"')
        ? "text-emerald-300"
        : token === "true" || token === "false"
          ? "text-violet-300"
          : token === "null"
            ? "text-rose-300"
            : "text-amber-300";
    pieces.push(
      <span key={`${match.index}-${token}`} className={className}>
        {token}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < value.length) pieces.push(value.slice(lastIndex));
  return pieces;
}

function JsonPreview({ value }: { value: string }) {
  return (
    <pre className="code-window max-h-[420px] min-h-[240px] overflow-auto p-4 font-mono text-xs leading-6">
      <code className="block min-w-max">{highlightJson(value)}</code>
    </pre>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      {(["pairs", "json"] as EditorMode[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${mode === item ? "bg-cyan-500 text-white" : "text-gray-500 hover:bg-white"
            }`}
        >
          {item === "pairs" ? <Database className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
          {item === "pairs" ? "Pairs" : "JSON"}
        </button>
      ))}
    </div>
  );
}

function PairEditor({
  pairs,
  onChange,
}: {
  pairs: ConfigPair[];
  onChange: (pairs: ConfigPair[]) => void;
}) {
  const updatePair = (index: number, field: keyof ConfigPair, value: string) => {
    onChange(pairs.map((pair, itemIndex) => (itemIndex === index ? { ...pair, [field]: value } : pair)));
  };

  return (
    <div className="space-y-2">
      {pairs.map((pair, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_38px] gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
          <input
            value={pair.key}
            onChange={(event) => updatePair(index, "key", event.target.value)}
            className="dev-input"
            placeholder="key"
          />
          <input
            value={pair.value}
            onChange={(event) => updatePair(index, "value", event.target.value)}
            className="dev-input font-mono text-xs"
            placeholder="value"
          />
          <button
            type="button"
            onClick={() => onChange(pairs.filter((_, itemIndex) => itemIndex !== index))}
            className="dev-button h-[42px] min-h-0 px-0"
            aria-label="Remove key"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...pairs, { key: "", value: "" }])}
        className="dev-button h-9 min-h-9"
      >
        <Plus className="h-4 w-4" />
        Add key
      </button>
    </div>
  );
}

export default function AppConfig() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("list");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createEndpoint, setCreateEndpoint] = useState("");
  const [createMode, setCreateMode] = useState<EditorMode>("pairs");
  const [createPairs, setCreatePairs] = useState<ConfigPair[]>([
    { key: "apiBaseUrl", value: "http://192.168.1.42:4000" },
    { key: "featureFlags", value: '{"oauth":true}' },
  ]);
  const [createJson, setCreateJson] = useState('{\n  "apiBaseUrl": "http://192.168.1.42:4000",\n  "featureFlags": {\n    "oauth": true\n  }\n}');

  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editEndpoint, setEditEndpoint] = useState("");
  const [editMode, setEditMode] = useState<EditorMode>("pairs");
  const [editPairs, setEditPairs] = useState<ConfigPair[]>([{ key: "", value: "" }]);
  const [editJson, setEditJson] = useState("{}");
  const [editLoaded, setEditLoaded] = useState(false);

  const configsQuery = useQuery({
    queryKey: ["app-configs"],
    queryFn: fetchAppConfigs,
  });
  const configs = configsQuery.data ?? [];

  useEffect(() => {
    if (configsQuery.error) {
      toast.error(getErrorMessage(configsQuery.error, "Failed to load configs"));
    }
  }, [configsQuery.error]);

  const createPreview = useMemo(() => {
    try {
      const config = createMode === "json" ? parseJsonObject(createJson) : pairsToConfig(createPairs);
      return JSON.stringify(config, null, 2);
    } catch {
      return createJson;
    }
  }, [createJson, createMode, createPairs]);

  const editPreview = useMemo(() => {
    try {
      const config = editMode === "json" ? parseJsonObject(editJson) : pairsToConfig(editPairs);
      return JSON.stringify(config, null, 2);
    } catch {
      return editJson;
    }
  }, [editJson, editMode, editPairs]);

  const createMutation = useMutation({
    mutationFn: createAppConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-configs"] });
      setCreateName("");
      setCreateEndpoint("");
      setCreateMode("pairs");
      setCreatePairs([{ key: "", value: "" }]);
      setCreateJson("{}");
      setTab("list");
      toast.success("Config created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Create failed"));
    }
  });

  const loadMutation = useMutation({
    mutationFn: fetchAppConfigById,
    onSuccess: (cfg) => {
      setEditName(pickName(cfg) === "Unnamed config" ? "" : pickName(cfg));
      setEditEndpoint(pickEndpoint(cfg));
      const configs = pickConfigs(cfg);
      setEditPairs(configToPairs(configs));
      setEditJson(JSON.stringify(configs, null, 2));
      setEditMode("pairs");
      setEditLoaded(true);
      toast.success("Config loaded");
    },
    onError: (error) => {
      setEditLoaded(false);
      toast.error(getErrorMessage(error, "Load failed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAppConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-configs"] });
      toast.success("Config updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Update failed"));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppConfig,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ConfigRecord[]>(["app-configs"], (current) =>
        (current ?? []).filter((cfg) => pickId(cfg) !== id)
      );
      void queryClient.invalidateQueries({ queryKey: ["app-configs"] });
      toast.success("Config deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Delete failed"));
    }
  });

  const endpointCount = configs.filter((cfg) => pickEndpoint(cfg)).length;
  const configKeyCount = configs.reduce((sum, cfg) => sum + Object.keys(pickConfigs(cfg)).length, 0);

  const copyUrl = async (id: string, key: string) => {
    await navigator.clipboard.writeText(getAppConfigUrl(id));
    setCopiedKey(key);
    toast.success("Config URL copied");
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const startEdit = (cfg: ConfigRecord) => {
    const id = pickId(cfg);
    setTab("edit");
    setEditId(id);
    setEditName(pickName(cfg) === "Unnamed config" ? "" : pickName(cfg));
    setEditEndpoint(pickEndpoint(cfg));
    setEditPairs(configToPairs(pickConfigs(cfg)));
    setEditJson(JSON.stringify(pickConfigs(cfg), null, 2));
    setEditMode("pairs");
    setEditLoaded(true);
  };

  const createConfig = () => {
    try {
      const configs = createMode === "json" ? parseJsonObject(createJson) : pairsToConfig(createPairs);
      createMutation.mutate({
        appConfig: createName.trim(),
        endpoint: createEndpoint.trim(),
        configs,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid JSON"));
    }
  };

  const updateConfig = () => {
    try {
      const configs = editMode === "json" ? parseJsonObject(editJson) : pairsToConfig(editPairs);
      updateMutation.mutate({
        id: editId.trim(),
        app_name: editName.trim() || undefined,
        endpoint: editEndpoint.trim() || undefined,
        configs,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid JSON"));
    }
  };

  const switchCreateMode = (mode: EditorMode) => {
    if (mode === createMode) return;
    if (mode === "json") {
      setCreateJson(JSON.stringify(pairsToConfig(createPairs), null, 2));
      setCreateMode("json");
      return;
    }
    try {
      setCreatePairs(configToPairs(parseJsonObject(createJson)));
      setCreateMode("pairs");
    } catch (error) {
      toast.error(getErrorMessage(error, "Fix JSON before switching modes"));
    }
  };

  const switchEditMode = (mode: EditorMode) => {
    if (mode === editMode) return;
    if (mode === "json") {
      setEditJson(JSON.stringify(pairsToConfig(editPairs), null, 2));
      setEditMode("json");
      return;
    }
    try {
      setEditPairs(configToPairs(parseJsonObject(editJson)));
      setEditMode("pairs");
    } catch (error) {
      toast.error(getErrorMessage(error, "Fix JSON before switching modes"));
    }
  };

  const importConfigFile = async (file: File | undefined, target: "create" | "edit") => {
    if (!file) return;
    try {
      const imported = parseConfigInput(await file.text());
      if (imported.length === 0) {
        toast.error("No key-value pairs found in file");
        return;
      }
      if (target === "create") {
        setCreateMode("pairs");
        setCreatePairs((current) => mergePairs(current, imported));
      } else {
        setEditMode("pairs");
        setEditPairs((current) => mergePairs(current, imported));
      }
      toast.success(
        `${imported.length} key${imported.length === 1 ? "" : "s"} imported`
      );
    } catch {
      toast.error("Failed to read config file");
    }
  };

  return (
    <main className="app-page grid-canvas px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="status-pill">Config Control Plane</span>
            <h1 className="mt-4 text-3xl font-semibold text-gray-950 md:text-4xl">App Configs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Serve startup JSON from a public URL, then edit the live payload when your backend IP changes.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 md:min-w-[420px]">
            <MetricTile label="Configs" value={String(configs.length)} icon={<Database className="h-4 w-4" />} />
            <MetricTile label="Endpoints" value={String(endpointCount)} icon={<Globe2 className="h-4 w-4" />} />
            <MetricTile label="Keys" value={String(configKeyCount)} icon={<Braces className="h-4 w-4" />} />
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          {[
            ["list", "All Configs", FileJson],
            ["create", "New Config", Plus],
            ["edit", "Edit Config", Pencil],
          ].map(([value, label, Icon]) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setTab(value as Tab)}
              className={`dev-button h-9 min-h-9 ${tab === value ? "dev-button-primary" : ""}`}
            >
              <Icon className="h-4 w-4" />
              {String(label)}
            </button>
          ))}
        </div>

        {tab === "list" ? (
          <section className="chrome-card-strong overflow-hidden rounded-xl">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <p className="dev-label mb-0">
                <ServerCog className="h-3.5 w-3.5" />
                Configuration Registry
              </p>
            </div>
            {configsQuery.isLoading ? (
              <div className="flex items-center gap-3 p-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading configs
              </div>
            ) : configs.length === 0 ? (
              <div className="p-10 text-center">
                <FileJson className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-700">No configs yet</p>
                <button type="button" onClick={() => setTab("create")} className="dev-button dev-button-primary mt-5">
                  <Plus className="h-4 w-4" />
                  Create config
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {configs.map((cfg) => {
                  const id = pickId(cfg);
                  const copied = copiedKey === id;
                  return (
                    <div key={id} className="grid gap-4 p-4 md:grid-cols-[1fr_1.3fr_0.8fr_auto] md:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-950">{pickName(cfg)}</p>
                        <p className="mt-1 font-mono text-xs text-gray-400">{shortId(id)}</p>
                      </div>
                      <p className="min-w-0 truncate font-mono text-xs text-gray-600">{pickEndpoint(cfg) || "No endpoint"}</p>
                      <span className="mono-chip">{Object.keys(pickConfigs(cfg)).length} keys</span>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void copyUrl(id, id)} className="dev-button h-9 min-h-9 px-3">
                          {copied ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : <Copy className="h-4 w-4" />}
                          {copied ? "Copied" : "URL"}
                        </button>
                        <button type="button" onClick={() => startEdit(cfg)} className="dev-button h-9 min-h-9 px-3">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteMutation.mutate(id)} className="dev-button dev-button-danger h-9 min-h-9 px-3">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {tab === "create" ? (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="chrome-card-strong rounded-xl p-4 sm:p-5">
              <p className="dev-label">
                <Plus className="h-3.5 w-3.5" />
                Create Config
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="dev-label">App name</label>
                  <input value={createName} onChange={(event) => setCreateName(event.target.value)} className="dev-input" placeholder="mobile-app" />
                </div>
                <div>
                  <label className="dev-label">Endpoint</label>
                  <input value={createEndpoint} onChange={(event) => setCreateEndpoint(event.target.value)} className="dev-input" placeholder="http://192.168.x.x:4000" />
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="dev-label mb-0">
                    <Code2 className="h-3.5 w-3.5" />
                    Config payload
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <ModeToggle mode={createMode} onChange={switchCreateMode} />
                    <label className="dev-button h-10 min-h-10 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload file
                      <input
                        type="file"
                        accept=".json,.env,.txt,application/json,text/plain"
                        className="sr-only"
                        onChange={(event) => {
                          void importConfigFile(event.target.files?.[0], "create");
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                {createMode === "pairs" ? (
                  <PairEditor pairs={createPairs} onChange={setCreatePairs} />
                ) : (
                  <textarea
                    value={createJson}
                    onChange={(event) => setCreateJson(event.target.value)}
                    rows={10}
                    className="dev-input font-mono text-xs leading-6"
                  />
                )}
              </div>
              <button type="button" onClick={createConfig} disabled={createMutation.isPending} className="dev-button dev-button-primary mt-4 w-full">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create config
              </button>
            </div>
            <div className="chrome-card-strong hidden rounded-xl p-5 lg:block">
              <p className="dev-label">
                <Clipboard className="h-3.5 w-3.5" />
                Preview
              </p>
              <JsonPreview value={createPreview} />
            </div>
          </section>
        ) : null}

        {tab === "edit" ? (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="chrome-card-strong rounded-xl p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="dev-label mb-0">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Config
                </p>
                {editLoaded ? (
                  <button type="button" onClick={updateConfig} disabled={updateMutation.isPending} className="dev-button dev-button-primary h-9 min-h-9 sm:w-auto">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    Save changes
                  </button>
                ) : null}
              </div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input value={editId} onChange={(event) => setEditId(event.target.value)} className="dev-input font-mono" placeholder="config id" />
                <button type="button" onClick={() => loadMutation.mutate(editId.trim())} className="dev-button min-w-[108px]" disabled={loadMutation.isPending}>
                  {loadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Load
                </button>
              </div>

              {editLoaded ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="dev-label">App name</label>
                      <input value={editName} onChange={(event) => setEditName(event.target.value)} className="dev-input" />
                    </div>
                    <div>
                      <label className="dev-label">Endpoint</label>
                      <input value={editEndpoint} onChange={(event) => setEditEndpoint(event.target.value)} className="dev-input" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="dev-label">Config URL</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_42px] gap-2">
                      <input value={getAppConfigUrl(editId.trim())} readOnly className="dev-input font-mono text-xs text-gray-500" />
                      <button type="button" onClick={() => void copyUrl(editId.trim(), "edit-url")} className="dev-button px-3">
                        {copiedKey === "edit-url" ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="dev-label mb-0">Config payload</label>
                      <div className="flex flex-wrap gap-2">
                        <ModeToggle mode={editMode} onChange={switchEditMode} />
                        <label className="dev-button h-10 min-h-10 cursor-pointer">
                          <Upload className="h-4 w-4" />
                          Upload file
                          <input
                            type="file"
                            accept=".json,.env,.txt,application/json,text/plain"
                            className="sr-only"
                            onChange={(event) => {
                              void importConfigFile(event.target.files?.[0], "edit");
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    {editMode === "pairs" ? (
                      <PairEditor pairs={editPairs} onChange={setEditPairs} />
                    ) : (
                      <textarea
                        value={editJson}
                        onChange={(event) => setEditJson(event.target.value)}
                        rows={10}
                        className="dev-input font-mono text-xs leading-6"
                      />
                    )}
                  </div>
                  <button type="button" onClick={updateConfig} disabled={updateMutation.isPending} className="dev-button dev-button-primary mt-4 hidden w-full sm:flex">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    Save changes
                  </button>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
                  Paste a config id or choose Edit from the registry.
                </div>
              )}
            </div>
            <div className="chrome-card-strong hidden rounded-xl p-5 lg:block">
              <p className="dev-label">Preview</p>
              <JsonPreview value={editPreview} />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

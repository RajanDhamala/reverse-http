import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Braces,
  CheckCircle2,
  Code2,
  ClipboardPaste,
  Copy,
  Database,
  Eye,
  FileJson,
  Globe2,
  KeyRound,
  LayoutList,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Search,
  ServerCog,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

type Tab = "list" | "create" | "edit";
type EditorMode = "pairs" | "json";
type ConfigMap = Record<string, unknown>;
type ConfigPair = { key: string; value: string };
type ConfigPayload = {
  appConfig: string;
  endpoint: string;
  configs: unknown;
};
type UpdateConfigPayload = ConfigPayload & { id: string };

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
};

const BASE = "http://localhost:3000";

async function req(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown
): Promise<Response> {
  return fetch(BASE + path, {
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
  const r = await req("/app/allConfigs");
  if (!r.ok) throw new Error("list failed");
  const data = await readJson(r);
  const list: ConfigRecord[] = data.configs || data.data || [];
  return Array.isArray(list) ? list : [];
}

async function fetchAppConfigById(id: string): Promise<ConfigRecord> {
  const r = await req("/app/config/" + encodeURIComponent(id));
  if (!r.ok) throw new Error("load failed");
  const data = await readJson(r);
  return data.config || data.data || data;
}

async function createAppConfig(payload: ConfigPayload) {
  const r = await req("/app/init", "POST", payload);
  if (!r.ok) throw new Error("create failed");
  return readJson(r);
}

async function updateAppConfig(payload: UpdateConfigPayload) {
  const r = await req("/app/update", "PATCH", payload);
  if (!r.ok) throw new Error("update failed");
  return readJson(r);
}

async function deleteAppConfig(id: string) {
  const r = await req(
    "/app/delete/" + encodeURIComponent(id),
    "DELETE"
  );
  if (!r.ok) throw new Error("delete failed");
  return readJson(r);
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function pickId(cfg: ConfigRecord) {
  return cfg.id ?? cfg.ID ?? "";
}
function pickName(cfg: ConfigRecord) {
  return cfg.app_name ?? cfg.AppName ?? cfg.appConfig ?? "Unnamed";
}
function pickEndpoint(cfg: ConfigRecord) {
  return cfg.endpoint ?? cfg.Endpoint ?? "";
}
function pickConfigs(cfg: ConfigRecord) {
  return cfg.configs ?? cfg.Configs ?? {};
}
function shortId(id: string) {
  if (!id) return "No id";
  return id.length > 10 ? `${id.slice(0, 8)}..` : id;
}

function getAppConfigUrl(id: string) {
  return `http://localhost:3000/app/config/${id}`;
}

type Toast = { kind: "success" | "error"; text: string } | null;

const fieldClass =
  "w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-neutral-700 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-600/20";

const labelClass =
  "mb-2 flex items-center gap-2 text-xs font-medium text-neutral-500";

const panelClass =
  "border border-neutral-800 bg-neutral-900/70 shadow-2xl shadow-black/20";

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
  for (const { key, value } of pairs) {
    const k = key.trim();
    if (k) obj[k] = parseLooseValue(value);
  }
  return obj;
}

function configToPairs(configs: ConfigMap): ConfigPair[] {
  return Object.entries(configs).map(([key, value]) => ({
    key,
    value: stringifyValue(value),
  }));
}

function mergePairs(current: ConfigPair[], incoming: ConfigPair[]) {
  const next = [...current];
  for (const pair of incoming) {
    const key = pair.key.trim();
    if (!key) continue;
    const idx = next.findIndex((item) => item.key.trim() === key);
    if (idx >= 0) next[idx] = { key, value: pair.value };
    else next.push({ key, value: pair.value });
  }
  return next;
}

function parseConfigInput(input: string): ConfigPair[] {
  const raw = input.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return configToPairs(parsed as ConfigMap);
    }
  } catch {
    // fall through to key-value formats
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("//"));

  const pairs: ConfigPair[] = [];
  for (const line of lines) {
    const normalized = line.replace(/,$/, "");
    const eq = normalized.indexOf("=");
    const colon = normalized.indexOf(":");
    const separator =
      eq >= 0 && colon >= 0 ? Math.min(eq, colon) : eq >= 0 ? eq : colon;
    if (separator > 0) {
      const key = normalized
        .slice(0, separator)
        .trim()
        .replace(/^["']|["']$/g, "");
      const value = normalized
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key) pairs.push({ key, value });
    }
  }

  if (pairs.length > 0) return pairs;

  if (lines.length >= 2 && lines.length % 2 === 0) {
    for (let i = 0; i < lines.length; i += 2) {
      pairs.push({ key: lines[i], value: lines[i + 1] });
    }
  }

  return pairs;
}

function highlightJson(value: string) {
  const tokenRegex =
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const pieces: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(value))) {
    if (match.index > lastIndex) {
      pieces.push(value.slice(lastIndex, match.index));
    }

    const token = match[0];
    const className = token.endsWith(":")
      ? "text-sky-300"
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

function JsonPreview({
  value,
  minHeight = "min-h-[260px]",
}: {
  value: string;
  minHeight?: string;
}) {
  return (
    <pre
      className={cx(
        minHeight,
        "max-h-[70vh] w-full max-w-full overflow-auto rounded-lg border border-neutral-800 bg-black px-3 py-3 font-mono text-xs leading-5 text-neutral-400 outline-none"
      )}
    >
      <code className="block min-w-max">{highlightJson(value)}</code>
    </pre>
  );
}

function ToastBanner({ toast }: { toast: Toast }) {
  if (!toast) return null;
  const isOk = toast.kind === "success";
  return (
    <div
      className={cx(
        "mb-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg shadow-black/20",
        isOk
          ? "border-neutral-700 bg-neutral-900 text-neutral-100"
          : "border-red-950/70 bg-red-950/20 text-red-200"
      )}
      role="status"
      aria-live="polite"
    >
      {isOk ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <span>{toast.text}</span>
    </div>
  );
}

function IconTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm transition",
        active
          ? "border-neutral-200 bg-neutral-100 text-neutral-950 shadow-lg shadow-white/5"
          : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-100"
      )}
    >
      <span className={cx("text-base", active ? "text-neutral-950" : "text-neutral-500")}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={cx(panelClass, "rounded-xl p-4")}>
      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400">
        {icon}
      </div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-100">{value}</p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
          {meta ? <p className="mt-1 text-xs text-neutral-500">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function AppConfig() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("list");

  // LIST
  const [listToast, setListToast] = useState<Toast>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedConfigKey, setCopiedConfigKey] = useState<string | null>(null);

  // CREATE
  const [createToast, setCreateToast] = useState<Toast>(null);
  const [cName, setCName] = useState("");
  const [cEndpoint, setCEndpoint] = useState("");
  const [kvPairs, setKvPairs] = useState<ConfigPair[]>([{ key: "theme", value: "dark" }]);
  const [cImportText, setCImportText] = useState("");

  // EDIT
  const [editToast, setEditToast] = useState<Toast>(null);
  const [eId, setEId] = useState("");
  const [eName, setEName] = useState("");
  const [eEndpoint, setEEndpoint] = useState("");
  const [eConfigsText, setEConfigsText] = useState<string>("{}");
  const [eKvPairs, setEKvPairs] = useState<ConfigPair[]>([]);
  const [eImportText, setEImportText] = useState("");
  const [eEditorMode, setEEditorMode] = useState<EditorMode>("pairs");
  const [editFieldsVisible, setEditFieldsVisible] = useState(false);

  function showToast(setter: (t: Toast) => void, toast: Toast) {
    setter(toast);
    if (toast) {
      window.setTimeout(() => setter(null), 3000);
    }
  }

  const configsQuery = useQuery({
    queryKey: ["app-configs"],
    queryFn: fetchAppConfigs,
    enabled: tab === "list",
  });
  const configs = configsQuery.data ?? [];
  const loadingList =
    configsQuery.isLoading || (configsQuery.isFetching && configs.length === 0);

  const createPreview = useMemo(() => {
    return JSON.stringify(pairsToConfig(kvPairs), null, 2);
  }, [kvPairs]);

  const editPairPreview = useMemo(() => {
    return JSON.stringify(pairsToConfig(eKvPairs), null, 2);
  }, [eKvPairs]);

  const editJsonStatus = useMemo(() => {
    try {
      const parsed = JSON.parse(eConfigsText);
      return {
        ok: true,
        value: JSON.stringify(parsed, null, 2),
      };
    } catch {
      return { ok: false, value: eConfigsText };
    }
  }, [eConfigsText]);

  useEffect(() => {
    if (configsQuery.isError && tab === "list") {
      showToast(setListToast, { kind: "error", text: "Failed to load configs." });
    }
  }, [configsQuery.isError, tab]);

  const createConfigMutation = useMutation({
    mutationFn: createAppConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-configs"] });
      showToast(setCreateToast, { kind: "success", text: "Config created!" });
      setCName("");
      setCEndpoint("");
      setKvPairs([{ key: "", value: "" }]);
      setCImportText("");
    },
    onError: () => {
      showToast(setCreateToast, { kind: "error", text: "Failed to create config" });
    },
  });

  const loadConfigMutation = useMutation({
    mutationFn: fetchAppConfigById,
    onSuccess: (cfg) => {
      const loadedConfigs = pickConfigs(cfg);

      setEName(pickName(cfg) === "Unnamed" ? "" : pickName(cfg));
      setEEndpoint(pickEndpoint(cfg));
      setEConfigsText(JSON.stringify(loadedConfigs, null, 2));
      setEKvPairs(configToPairs(loadedConfigs));
      setEEditorMode("pairs");
      setEImportText("");
      setEditFieldsVisible(true);
    },
    onError: () => {
      showToast(setEditToast, { kind: "error", text: "Failed to load config" });
      setEditFieldsVisible(false);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: updateAppConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-configs"] });
      showToast(setEditToast, { kind: "success", text: "Config updated!" });
    },
    onError: () => {
      showToast(setEditToast, { kind: "error", text: "Failed to update config" });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: deleteAppConfig,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ConfigRecord[]>(["app-configs"], (prev) =>
        (prev ?? []).filter((cfg) => pickId(cfg) !== id)
      );
      void queryClient.invalidateQueries({ queryKey: ["app-configs"] });
      setOpenMenuId(null);
      setDeleteConfirmId(null);
      showToast(setListToast, { kind: "success", text: "Config deleted" });
    },
    onError: () => {
      showToast(setListToast, { kind: "error", text: "Failed to delete config" });
    },
  });

  const deletingId = deleteConfigMutation.isPending
    ? deleteConfigMutation.variables ?? null
    : null;
  const loadingEdit = loadConfigMutation.isPending;

  function addKV(key = "", value = "") {
    setKvPairs((prev) => [...prev, { key, value }]);
  }

  function removeKV(idx: number) {
    setKvPairs((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateKV(idx: number, field: keyof ConfigPair, value: string) {
    setKvPairs((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  function addEditKV(key = "", value = "") {
    setEKvPairs((prev) => [...prev, { key, value }]);
  }

  function removeEditKV(idx: number) {
    setEKvPairs((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateEditKV(idx: number, field: keyof ConfigPair, value: string) {
    setEKvPairs((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  function importPairsFromText(
    text: string,
    setter: React.Dispatch<React.SetStateAction<ConfigPair[]>>,
    toastSetter: (t: Toast) => void
  ) {
    const imported = parseConfigInput(text);
    if (imported.length === 0) {
      showToast(toastSetter, {
        kind: "error",
        text: "Could not find JSON or key-value pairs to import",
      });
      return false;
    }

    setter((prev) => mergePairs(prev, imported));
    showToast(toastSetter, {
      kind: "success",
      text: `${imported.length} ${imported.length === 1 ? "pair" : "pairs"} inserted`,
    });
    return true;
  }

  async function importPairsFromFile(
    file: File | undefined,
    setter: React.Dispatch<React.SetStateAction<ConfigPair[]>>,
    toastSetter: (t: Toast) => void
  ) {
    if (!file) return;
    try {
      importPairsFromText(await file.text(), setter, toastSetter);
    } catch {
      showToast(toastSetter, { kind: "error", text: "Failed to read file" });
    }
  }

  async function createConfig() {
    const appConfig = cName.trim();
    const endpoint = cEndpoint.trim();
    if (!appConfig || !endpoint) {
      showToast(setCreateToast, {
        kind: "error",
        text: "App name and endpoint are required",
      });
      return;
    }

    const configsObj = pairsToConfig(kvPairs);

    createConfigMutation.mutate({
      appConfig,
      endpoint,
      configs: configsObj,
    });
  }

  function loadConfigById(id: string) {
    const trimmed = id.trim();
    if (!trimmed) return;
    loadConfigMutation.mutate(trimmed);
  }

  function prefillEditFromList(cfg: ConfigRecord) {
    const id = pickId(cfg);
    const loadedConfigs = pickConfigs(cfg);
    setOpenMenuId(null);
    setDeleteConfirmId(null);
    setTab("edit");
    setEId(id);
    setEName(pickName(cfg) === "Unnamed" ? "" : pickName(cfg));
    setEEndpoint(pickEndpoint(cfg));
    setEConfigsText(JSON.stringify(loadedConfigs, null, 2));
    setEKvPairs(configToPairs(loadedConfigs));
    setEEditorMode("pairs");
    setEImportText("");
    setEditFieldsVisible(true);
  }

  async function deleteConfig(id: string) {
    if (!id) {
      showToast(setListToast, { kind: "error", text: "Config id is missing" });
      return;
    }

    deleteConfigMutation.mutate(id);
  }

  function copyConfigUrl(id: string, copiedKey: string) {
    console.log(getAppConfigUrl(id))
    void navigator.clipboard.writeText(getAppConfigUrl(id)).then(() => {
      setCopiedConfigKey(copiedKey);
      window.setTimeout(() => {
        setCopiedConfigKey((current) =>
          current === copiedKey ? null : current
        );

        setOpenMenuId(null);
      }, 1800);

    });
  }

  function switchEditMode(mode: EditorMode) {
    if (mode === eEditorMode) return;
    if (mode === "json") {
      setEConfigsText(JSON.stringify(pairsToConfig(eKvPairs), null, 2));
      setEEditorMode("json");
      return;
    }

    try {
      const parsed = JSON.parse(eConfigsText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid config shape");
      }
      setEKvPairs(configToPairs(parsed as ConfigMap));
      setEEditorMode("pairs");
    } catch {
      showToast(setEditToast, {
        kind: "error",
        text: "Fix JSON before switching to key-value editing",
      });
    }
  }

  async function updateConfig() {
    const id = eId.trim();
    const appConfig = eName.trim();
    const endpoint = eEndpoint.trim();

    let configs: unknown;
    if (eEditorMode === "json") {
      try {
        configs = JSON.parse(eConfigsText);
      } catch {
        showToast(setEditToast, { kind: "error", text: "Invalid JSON in configs" });
        return;
      }
    } else {
      configs = pairsToConfig(eKvPairs);
    }

    updateConfigMutation.mutate({
      id,
      appConfig,
      endpoint,
      configs,
    });
  }

  const endpointCount = configs.filter((cfg) => pickEndpoint(cfg)).length;
  const configKeyCount = configs.reduce(
    (sum, cfg) => sum + Object.keys(pickConfigs(cfg)).length,
    0
  );

  return (
    <div className="min-h-screen w-full bg-neutral-950 px-4 py-6 text-neutral-100 md:px-8">
      <h2 className="sr-only">
        App Config Dashboard - create, list, and edit app configurations
      </h2>

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 border-b border-neutral-900 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-500">
              <ServerCog className="h-3.5 w-3.5" aria-hidden="true" />
              Reverse HTTP control plane
            </div>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">App Configs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Create and maintain OAuth application endpoints with a compact dark console.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <MetricTile
              icon={<Database className="h-4 w-4" aria-hidden="true" />}
              label="Configs"
              value={String(configs.length)}
            />
            <MetricTile
              icon={<Globe2 className="h-4 w-4" aria-hidden="true" />}
              label="Endpoints"
              value={String(endpointCount)}
            />
            <MetricTile
              icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
              label="Keys"
              value={String(configKeyCount)}
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 p-2">
          <IconTabButton
            active={tab === "list"}
            onClick={() => setTab("list")}
            icon={<LayoutList className="h-4 w-4" aria-hidden="true" />}
            label="All Configs"
          />
          <IconTabButton
            active={tab === "create"}
            onClick={() => setTab("create")}
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            label="New Config"
          />
          <IconTabButton
            active={tab === "edit"}
            onClick={() => setTab("edit")}
            icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
            label="Edit Config"
          />
        </div>

        {tab === "list" && (
          <div>
            <ToastBanner toast={listToast} />

            <div className={cx(panelClass, "rounded-xl p-5 md:p-6")}>
              <SectionTitle
                icon={<LayoutList className="h-4 w-4" aria-hidden="true" />}
                title="Configuration registry"
                meta={`${configs.length} records loaded from the API`}
              />

              {loadingList ? (
                <div className="flex items-center justify-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 py-12 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading configs
                </div>
              ) : configs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950 px-6 py-12 text-center">
                  <FileJson className="mx-auto h-8 w-8 text-neutral-700" aria-hidden="true" />
                  <p className="mt-4 text-sm font-medium text-neutral-300">No configs yet</p>
                  <button
                    type="button"
                    onClick={() => setTab("create")}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-3.5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-white"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New config
                  </button>
                </div>
              ) : (
                <div className="overflow-visible rounded-lg border border-neutral-800">
                  <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-3 text-xs text-neutral-500 md:grid">
                    <span>Application</span>
                    <span>Endpoint</span>
                    <span>Identifier</span>
                    <span>Actions</span>
                  </div>

                  <div className="divide-y divide-neutral-800">
                    {configs.map((cfg, idx) => {
                      const id = pickId(cfg);
                      const name = pickName(cfg);
                      const endpoint = pickEndpoint(cfg);
                      const keys = Object.keys(pickConfigs(cfg)).length;
                      const actionKey = id || `row-${idx}`;
                      const menuDropsUp = idx === configs.length - 1;
                      const isConfigUrlCopied = copiedConfigKey === actionKey;

                      return (
                        <div
                          key={id || idx}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 bg-neutral-900 px-4 py-4 transition hover:bg-neutral-900/60 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center"
                        >
                          <div className="col-span-2 min-w-0 md:col-span-1">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-500">
                                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-neutral-100">
                                  {name}
                                </p>
                                <p className="mt-0.5 text-xs text-neutral-600">
                                  {keys} config {keys === 1 ? "key" : "keys"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2 min-w-0 md:col-span-1">
                            <p className="truncate font-mono text-xs text-neutral-400">
                              {endpoint || "No endpoint"}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <span
                              className="inline-flex max-w-full items-center rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-500"
                              title={id || "No id"}
                            >
                              <span className="truncate">{shortId(id)}</span>
                            </span>
                          </div>

                          <div className="relative justify-self-end">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId((current) =>
                                  current === actionKey ? null : actionKey
                                );
                                setDeleteConfirmId(null);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400 transition hover:border-neutral-600 hover:text-white"
                              aria-label={`Open actions for ${name}`}
                              title="Actions"
                            >
                              <MoreVertical className="h-4 w-4" aria-hidden="true" />
                            </button>

                            {openMenuId === actionKey ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                                  aria-label="Close actions menu"
                                />
                                <div
                                  className={cx(
                                    "fixed left-4 right-4 top-1/2 z-50 w-auto -translate-y-1/2 rounded-lg border border-neutral-800 bg-neutral-950 p-1.5 shadow-2xl shadow-black/40 md:absolute md:left-auto md:right-0 md:top-auto md:w-52 md:translate-y-0",
                                    menuDropsUp ? "md:bottom-full md:mb-2" : "md:mt-2"
                                  )}
                                >
                                  {deleteConfirmId === actionKey ? (
                                    <div className="p-2">
                                      <p className="text-xs font-medium text-neutral-100">
                                        Delete this config?
                                      </p>
                                      <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                                        This action cannot be undone.
                                      </p>
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setDeleteConfirmId(null)}
                                          className="inline-flex h-8 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deleteConfig(id)}
                                          disabled={deletingId === id}
                                          className={cx(
                                            "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition",
                                            deletingId === id
                                              ? "cursor-not-allowed border-red-950/70 bg-red-950/20 text-red-300/60"
                                              : "border-red-900/70 bg-red-950/30 text-red-200 hover:border-red-700 hover:text-red-100"
                                          )}
                                        >
                                          {deletingId === id ? (
                                            <Loader2
                                              className="h-3.5 w-3.5 animate-spin"
                                              aria-hidden="true"
                                            />
                                          ) : (
                                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                          )}
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => prefillEditFromList(cfg)}
                                        className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-medium text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
                                      >
                                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteConfirmId(actionKey)}
                                        className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-medium text-red-200 transition hover:bg-red-950/30 hover:text-red-100"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        Delete
                                      </button>
                                      <button
                                        onClick={() => copyConfigUrl(id, actionKey)}
                                        type="button"
                                        className={cx(
                                          "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-medium transition",
                                          isConfigUrlCopied
                                            ? "bg-emerald-950/30 text-emerald-200"
                                            : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                                        )}
                                      >
                                        {isConfigUrlCopied ? (
                                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                        )}
                                        {isConfigUrlCopied ? "Copied" : "Copy"}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "create" && (
          <div className={cx(panelClass, "rounded-xl p-5 md:p-6")}>
            <ToastBanner toast={createToast} />
            <SectionTitle
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              title="Create configuration"
              meta="Register a new app endpoint and its JSON settings"
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      <Database className="h-3.5 w-3.5" aria-hidden="true" />
                      App name
                    </label>
                    <input
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="my-mobile-app"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Endpoint
                    </label>
                    <input
                      value={cEndpoint}
                      onChange={(e) => setCEndpoint(e.target.value)}
                      placeholder="https://api.example.com"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <label className={labelClass}>
                      <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                      Paste JSON or key-value pairs
                    </label>
                    <textarea
                      value={cImportText}
                      onChange={(e) => setCImportText(e.target.value)}
                      placeholder={'{\n  "theme": "dark"\n}\n\nor\nAPI_KEY=secret\nmode: live'}
                      rows={6}
                      className="min-h-[150px] w-full resize-y rounded-lg border border-neutral-800 bg-black px-3 py-3 font-mono text-xs leading-5 text-neutral-300 outline-none transition placeholder:text-neutral-700 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (importPairsFromText(cImportText, setKvPairs, setCreateToast)) {
                          setCImportText("");
                        }
                      }}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Insert pairs
                    </button>
                  </div>

                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      importPairsFromFile(
                        e.dataTransfer.files?.[0],
                        setKvPairs,
                        setCreateToast
                      );
                    }}
                    className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-neutral-900/80 px-4 text-center transition hover:border-neutral-500 hover:bg-neutral-900"
                  >
                    <input
                      type="file"
                      accept=".json,.env,.txt,application/json,text/plain"
                      className="sr-only"
                      onChange={(e) => {
                        importPairsFromFile(e.target.files?.[0], setKvPairs, setCreateToast);
                        e.currentTarget.value = "";
                      }}
                    />
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-black text-neutral-300">
                      <Upload className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-neutral-100">Drop config file</span>
                    <span className="mt-1 text-xs leading-5 text-neutral-500">
                      JSON, ENV, or TXT imports into the rows
                    </span>
                  </label>
                </div>

                <div>
                  <label className={labelClass}>
                    <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                    Config key-value pairs
                  </label>

                  <div className="space-y-2">
                    {kvPairs.map((kv, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2 rounded-lg border border-neutral-900 bg-neutral-950/70 p-2"
                      >
                        <input
                          value={kv.key}
                          onChange={(e) => updateKV(idx, "key", e.target.value)}
                          placeholder="key"
                          className={fieldClass}
                        />
                        <input
                          value={kv.value}
                          onChange={(e) => updateKV(idx, "value", e.target.value)}
                          placeholder="value"
                          className={fieldClass}
                        />
                        <button
                          type="button"
                          onClick={() => removeKV(idx)}
                          className="inline-flex h-[42px] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-100"
                          aria-label="Remove key"
                          title="Remove key"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addKV("", "")}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add key
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <label className={labelClass}>
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Preview JSON
                </label>
                <JsonPreview value={createPreview} />

                <button
                  type="button"
                  onClick={createConfig}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-white"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create config
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "edit" && (
          <div className={cx(panelClass, "min-w-0 max-w-full rounded-xl p-4 sm:p-5 md:p-6")}>
            <ToastBanner toast={editToast} />
            <SectionTitle
              icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              title="Edit configuration"
              meta="Load by id or use edit from the registry"
            />

            <div className="min-w-0 max-w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4">
              <label className={labelClass}>
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                Config ID
              </label>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <input
                  value={eId}
                  onChange={(e) => setEId(e.target.value)}
                  placeholder="paste config id"
                  className={cx(fieldClass, "min-w-0 max-w-full")}
                />
                <button
                  type="button"
                  onClick={() => loadConfigById(eId)}
                  disabled={loadingEdit}
                  className={cx(
                    "inline-flex h-[42px] min-w-[112px] items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition",
                    loadingEdit
                      ? "cursor-not-allowed border-neutral-800 bg-neutral-900 text-neutral-600"
                      : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500 hover:text-white"
                  )}
                >
                  {loadingEdit ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="h-4 w-4" aria-hidden="true" />
                  )}
                  Load
                </button>
              </div>
            </div>

            {editFieldsVisible && (
              <div className="mt-5 grid min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="min-w-0 max-w-full space-y-5">
                  <div className="grid min-w-0 max-w-full gap-4 md:grid-cols-2">
                    <div className="min-w-0">
                      <label className={labelClass}>
                        <Database className="h-3.5 w-3.5" aria-hidden="true" />
                        App name
                      </label>
                      <input
                        value={eName}
                        onChange={(e) => setEName(e.target.value)}
                        className={cx(fieldClass, "min-w-0 max-w-full")}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelClass}>
                        <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Endpoint
                      </label>
                      <input
                        value={eEndpoint}
                        onChange={(e) => setEEndpoint(e.target.value)}
                        className={cx(fieldClass, "min-w-0 max-w-full")}
                      />
                    </div>
                    <div className="min-w-0 md:col-span-2">
                      <label className={labelClass}>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Config URL
                      </label>
                      <div className="relative">
                        <input
                          value={getAppConfigUrl(eId.trim())}
                          readOnly
                          className={cx(
                            fieldClass,
                            "min-w-0 max-w-full cursor-default pr-10 font-mono text-neutral-400"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => copyConfigUrl(eId.trim(), "edit-config-url")}
                          disabled={!eId.trim()}
                          className={cx(
                            "absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition hover:bg-neutral-900 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40",
                            copiedConfigKey === "edit-config-url"
                              ? "text-emerald-300"
                              : "text-neutral-500"
                          )}
                          aria-label="Copy config URL"
                          title="Copy config URL"
                        >
                          {copiedConfigKey === "edit-config-url" ? (
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 max-w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4">
                    <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-400">
                          <Code2 className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-100">Payload editor</p>
                          <p className="text-xs text-neutral-600">
                            Switch between row editing and raw JSON
                          </p>
                        </div>
                      </div>

                      <div className="flex rounded-lg border border-neutral-800 bg-black p-1">
                        <button
                          type="button"
                          onClick={() => switchEditMode("pairs")}
                          className={cx(
                            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition",
                            eEditorMode === "pairs"
                              ? "bg-neutral-100 text-neutral-950"
                              : "text-neutral-500 hover:text-neutral-100"
                          )}
                        >
                          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                          Pairs
                        </button>
                        <button
                          type="button"
                          onClick={() => switchEditMode("json")}
                          className={cx(
                            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition",
                            eEditorMode === "json"
                              ? "bg-neutral-100 text-neutral-950"
                              : "text-neutral-500 hover:text-neutral-100"
                          )}
                        >
                          <Braces className="h-3.5 w-3.5" aria-hidden="true" />
                          JSON
                        </button>
                      </div>
                    </div>

                    {eEditorMode === "pairs" ? (
                      <div className="space-y-4">
                        <div className="grid min-w-0 max-w-full gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
                          <div className="min-w-0 max-w-full">
                            <label className={labelClass}>
                              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                              Paste more pairs
                            </label>
                            <textarea
                              value={eImportText}
                              onChange={(event) => setEImportText(event.target.value)}
                              placeholder={'client_id=abc\nclient_secret=xyz\n\nor paste a JSON object'}
                              rows={5}
                              className="min-h-[126px] min-w-0 w-full max-w-full resize-y overflow-auto rounded-lg border border-neutral-800 bg-black px-3 py-3 font-mono text-xs leading-5 text-neutral-300 outline-none transition placeholder:text-neutral-700 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-600/20"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  importPairsFromText(eImportText, setEKvPairs, setEditToast)
                                ) {
                                  setEImportText("");
                                }
                              }}
                              className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white"
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                              Insert pairs
                            </button>
                          </div>

                          <label
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              importPairsFromFile(
                                e.dataTransfer.files?.[0],
                                setEKvPairs,
                                setEditToast
                              );
                            }}
                            className="flex min-h-[126px] min-w-0 max-w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-700 bg-neutral-900/80 px-4 text-center transition hover:border-neutral-500 hover:bg-neutral-900"
                          >
                            <input
                              type="file"
                              accept=".json,.env,.txt,application/json,text/plain"
                              className="sr-only"
                              onChange={(event) => {
                                importPairsFromFile(
                                  event.target.files?.[0],
                                  setEKvPairs,
                                  setEditToast
                                );
                                event.currentTarget.value = "";
                              }}
                            />
                            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-black text-neutral-300">
                              <Upload className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span className="text-sm font-medium text-neutral-100">
                              Import file
                            </span>
                            <span className="mt-1 max-w-full text-xs leading-5 text-neutral-500">
                              Adds or replaces matching keys
                            </span>
                          </label>
                        </div>

                        <div>
                          <label className={labelClass}>
                            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                            Config key-value pairs
                          </label>

                          <div className="space-y-2">
                            {eKvPairs.map((kv, idx) => (
                              <div
                                key={idx}
                                className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-neutral-900 bg-neutral-950/70 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]"
                              >
                                <input
                                  value={kv.key}
                                  onChange={(event) =>
                                    updateEditKV(idx, "key", event.target.value)
                                  }
                                  placeholder="key"
                                  className={cx(fieldClass, "min-w-0 max-w-full")}
                                />
                                <input
                                  value={kv.value}
                                  onChange={(event) =>
                                    updateEditKV(idx, "value", event.target.value)
                                  }
                                  placeholder="value"
                                  className={cx(fieldClass, "min-w-0 max-w-full")}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditKV(idx)}
                                  className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-100"
                                  aria-label="Remove key"
                                  title="Remove key"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  <span className="text-xs font-medium sm:sr-only">Remove</span>
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => addEditKV("", "")}
                            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Add key
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className={labelClass}>
                          <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                          Configs JSON
                        </label>
                        <textarea
                          value={eConfigsText}
                          onChange={(e) => setEConfigsText(e.target.value)}
                          rows={16}
                          className="min-h-[360px] max-h-[70vh] min-w-0 w-full max-w-full resize-y overflow-auto rounded-lg border border-neutral-800 bg-black px-3 py-3 font-mono text-xs leading-5 text-neutral-300 outline-none focus:border-neutral-600"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 max-w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4">
                  <label className={labelClass}>
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    Preview JSON
                  </label>
                  <JsonPreview
                    value={eEditorMode === "pairs" ? editPairPreview : editJsonStatus.value}
                    minHeight="min-h-[360px]"
                  />
                  {eEditorMode === "json" && !editJsonStatus.ok ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-950/70 bg-red-950/20 px-3 py-2 text-xs text-red-200">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      JSON preview will colorize after the syntax is valid
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={updateConfig}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-white"
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Save changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

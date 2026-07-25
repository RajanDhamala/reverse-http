const fallbackAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%234f46e5'/%3E%3Ccircle cx='32' cy='25' r='11' fill='white'/%3E%3Cpath d='M14 55c2-12 9-18 18-18s16 6 18 18' fill='white'/%3E%3C/svg%3E";

export default function UserView({ identity, onLogout }) {
  const displayName =
    identity.username || identity.email || `${identity.provider_name} user`;
  const responseBody = { authenticated: true, identity };

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <header className="mb-7 flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <img
            className="size-12 shrink-0 rounded-full border border-slate-200 object-cover ring-4 ring-slate-100 sm:size-14"
            src={identity.avatar || fallbackAvatar}
            alt={`${displayName} avatar`}
          />

          <div className="min-w-0">
            <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase">
              Authenticated
            </span>
            <h2 className="mt-1 truncate text-xl font-bold text-slate-950">
              {displayName}
            </h2>
          </div>
        </div>

        <button
          type="button"
          className="shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-200 sm:w-auto"
          onClick={onLogout}
        >
          Sign out
        </button>
      </header>

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg shadow-slate-950/15">
        <div className="flex min-w-0 items-center gap-2 border-b border-slate-800 px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 min-w-0 truncate font-mono text-xs text-slate-400">
            GET /api/me
          </span>
        </div>

        <pre className="m-0 max-h-[410px] max-w-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 break-words text-emerald-300 [overflow-wrap:anywhere] sm:p-5 sm:text-sm sm:leading-6">
          <code>{JSON.stringify(responseBody, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}

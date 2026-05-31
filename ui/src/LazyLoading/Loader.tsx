export default function Loader() {
  return (
    <div className="grid-canvas flex min-h-[40vh] items-center justify-center">
      <div className="chrome-card flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-600">
        <span className="h-3 w-3 animate-pulse rounded-full bg-cyan-500" />
        Loading workspace
      </div>
    </div>
  );
}

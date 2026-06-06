import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import { frontendAddress } from "../Utils/env";

export default function Error404Page() {
  return (
    <main className="app-page grid-canvas flex min-h-screen items-center justify-center p-4">
      <div className="browser-shell w-full max-w-xl overflow-hidden rounded-2xl">
        <div className="browser-bar flex items-center gap-3 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="truncate font-mono text-xs text-gray-500">
            {frontendAddress("/404")}
          </span>
        </div>
        <section className="bg-white p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700">
            <Compass className="h-7 w-7" />
          </div>
          <p className="font-mono text-xs text-cyan-700">404_NOT_FOUND</p>
          <h1 className="mt-3 text-3xl font-semibold text-gray-950">Page not found</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600">
            This route is not registered in the Reverse HTTP workspace.
          </p>
          <Link to="/" className="dev-button dev-button-primary mt-7">
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </section>
      </div>
    </main>
  );
}

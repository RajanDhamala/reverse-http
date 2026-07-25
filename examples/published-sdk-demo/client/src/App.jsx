import { useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import LoginView from "./components/LoginView.jsx";
import UserView from "./components/UserView.jsx";

const backendUrl =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function App() {
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async () => {
    try {
      const response = await fetch("/api/me", { credentials: "include" });

      if (response.status === 401) {
        setIdentity(null);
        return;
      }

      if (!response.ok) throw new Error();

      const body = await response.json();
      setIdentity(body.identity);
    } catch {
      toast.error("Could not load your account");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauth_error");
    if (oauthError) {
      toast.error(`Sign in failed: ${oauthError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
    loadIdentity();
  }, [loadIdentity]);

  const logout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error();
      setIdentity(null);
      toast.success("Signed out");
    } catch {
      toast.error("Could not sign out");
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center overflow-x-hidden bg-slate-100 p-3 text-slate-900 sm:p-6 lg:p-8">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
          },
        }}
      />

      <div className="mx-auto w-full min-w-0 max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 sm:rounded-3xl">
        <section className="flex min-h-[480px] min-w-0 items-center px-5 py-10 sm:min-h-[560px] sm:p-12 lg:p-16">
          {loading ? (
            <div
              className="grid w-full justify-items-center gap-4 text-center"
              aria-live="polite"
            >
              <div className="size-7 animate-spin rounded-full border-3 border-slate-200 border-t-indigo-600" />
              <p className="m-0 text-sm text-slate-500">
                Checking your account…
              </p>
            </div>
          ) : identity ? (
            <UserView identity={identity} onLogout={logout} />
          ) : (
            <LoginView backendUrl={backendUrl} />
          )}
        </section>
      </div>
    </main>
  );
}

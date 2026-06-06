import { useEffect } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, Chrome, LogOut, Terminal } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl, frontendAddress } from "../Utils/env";

interface OAuthUserData {
  provider: string;
  id?: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

function parseOAuthData(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as OAuthUserData;
  } catch {
    return null;
  }
}

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorParam = searchParams.get("error");
  const userData = parseOAuthData(searchParams.get("data"));
  const error = errorParam
    ? decodeURIComponent(errorParam)
    : userData
      ? null
      : "No OAuth data received";

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "oauth_complete",
          ok: !error,
        },
        window.location.origin,
      );
    }
  }, [error]);

  const logoutUser = async () => {
    await axios.get(apiUrl("/user/logout"), {
      withCredentials: true,
    });
  };

  return (
    <main className="app-page grid-canvas flex min-h-screen items-center justify-center p-4">
      <div className="browser-shell w-full max-w-2xl overflow-hidden rounded-2xl">
        <div className="browser-bar flex items-center gap-3 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-3">
            <Chrome className="h-3.5 w-3.5 text-cyan-500" />
            <span className="truncate font-mono text-xs text-gray-500">
              {frontendAddress("/oauth/callback")}
            </span>
          </div>
        </div>

        <section className="bg-white p-6 sm:p-10">
          {error ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-950">Authentication Error</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600">{error}</p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <button type="button" onClick={() => navigate("/login")} className="dev-button dev-button-primary">
                  Back to Login
                </button>
                <button type="button" onClick={() => void logoutUser()} className="dev-button">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-950">OAuth Complete</h1>
                <p className="mt-2 text-sm text-gray-600">Provider profile data reached the frontend callback.</p>
              </div>

              <div className="chrome-card mt-8 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  {userData?.avatar_url ? (
                    <img src={userData.avatar_url} alt="Avatar" className="h-14 w-14 rounded-full border border-gray-200 object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-xl font-semibold text-cyan-700">
                      {userData?.full_name?.charAt(0) || userData?.email?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-950">{userData?.full_name || "User"}</p>
                    <p className="truncate text-sm text-gray-500">{userData?.email}</p>
                    <p className="mt-1 font-mono text-xs text-cyan-700">{userData?.provider}</p>
                  </div>
                </div>
              </div>

              <div className="code-window mt-5">
                <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3 font-mono text-xs text-gray-400">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                  response.json
                </div>
                <pre className="max-h-64 overflow-auto p-4 font-mono text-xs leading-6 text-gray-300">
                  {JSON.stringify(userData, null, 2)}
                </pre>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => navigate("/")} className="dev-button dev-button-primary flex-1">
                  Continue
                </button>
                <button type="button" onClick={() => void logoutUser()} className="dev-button flex-1">
                  Logout
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

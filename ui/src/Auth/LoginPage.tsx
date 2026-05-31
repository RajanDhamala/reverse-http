import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Chrome, Eye, EyeOff, Github, Lock, Mail, Terminal } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 1000);
  };

  const googleOauth = () => {
    window.location.href = "http://localhost:3000/oauth/google";
  };

  const githubOauth = () => {
    window.location.href = "http://localhost:3000/oauth/github";
  };

  return (
    <main className="app-page grid-canvas flex min-h-screen items-center justify-center p-4">
      <div className="browser-shell w-full max-w-[920px] overflow-hidden rounded-2xl">
        <div className="browser-bar flex items-center gap-3 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-3">
            <Chrome className="h-3.5 w-3.5 text-cyan-500" />
            <span className="truncate font-mono text-xs text-gray-500">
              reverse-http.local/login
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          <section className="grid-canvas hidden min-h-[540px] border-r border-gray-200 p-8 md:block">
            <span className="status-pill">Auth console</span>
            <h1 className="mt-6 max-w-sm text-4xl font-semibold leading-tight text-gray-950">
              Sign in to manage configs and OAuth routes.
            </h1>
            <div className="chrome-card-strong mt-10 rounded-xl p-5">
              <p className="dev-label">Session Preview</p>
              <div className="space-y-3 font-mono text-xs text-gray-600">
                <p><span className="text-cyan-600">GET</span> /user/me</p>
                <p><span className="text-cyan-600">COOKIE</span> accessToken</p>
                <p><span className="text-cyan-600">MODE</span> oauth-first</p>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 sm:p-10">
            <div className="mb-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
                <Terminal className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-950">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Use OAuth for the fastest path, or keep email login available for dev testing.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={googleOauth} className="dev-button">
                <Chrome className="h-4 w-4 text-cyan-600" />
                Google
              </button>
              <button type="button" onClick={githubOauth} className="dev-button">
                <Github className="h-4 w-4" />
                GitHub
              </button>
            </div>

            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="font-mono text-xs text-gray-400">email fallback</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="dev-label">
                  <Mail className="h-3.5 w-3.5" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="dev-input"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="dev-label mb-0">
                    <Lock className="h-3.5 w-3.5" />
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-medium text-cyan-700 hover:text-cyan-900">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="dev-input pr-10"
                    placeholder="password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-cyan-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                onClick={() => {
                  toast.error("use oauth")
                }}
                className="dev-button dev-button-primary w-full">
                {isLoading ? "Authenticating..." : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Do not have an account?{" "}
              <Link to="/register" className="font-semibold text-cyan-700 hover:text-cyan-900">
                Create one
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

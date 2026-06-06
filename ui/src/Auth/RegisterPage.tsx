import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast"
import { Chrome, Eye, EyeOff, Github, Lock, Mail, ServerCog, User } from "lucide-react";
import { frontendAddress, oauthProviderUrl } from "../Utils/env";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const passwordsMismatch = Boolean(confirmPassword) && password !== confirmPassword;

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordsMismatch) return;
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 1000);
  };

  const googleOauth = () => {
    window.location.href = oauthProviderUrl("google");
  };

  const githubOauth = () => {
    window.location.href = oauthProviderUrl("github");
  };

  return (
    <main className="app-page grid-canvas flex min-h-screen items-center justify-center p-4">
      <div className="browser-shell w-full max-w-[960px] overflow-hidden rounded-2xl">
        <div className="browser-bar flex items-center gap-3 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-3">
            <Chrome className="h-3.5 w-3.5 text-cyan-500" />
            <span className="truncate font-mono text-xs text-gray-500">
              {frontendAddress("/register")}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_0.95fr]">
          <section className="bg-white p-6 sm:p-10">
            <div className="mb-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
                <ServerCog className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-950">Create an account</h1>
              <p className="mt-2 text-sm text-gray-600">
                Start with OAuth or keep an email account for local development.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={githubOauth} className="dev-button">
                <Github className="h-4 w-4" />
                GitHub
              </button>
              <button type="button" onClick={googleOauth} className="dev-button">
                <Chrome className="h-4 w-4 text-cyan-600" />
                Google
              </button>
            </div>

            <form onSubmit={handleRegister} className="mt-7 space-y-4">
              <div>
                <label className="dev-label">
                  <User className="h-3.5 w-3.5" />
                  Full Name
                </label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="dev-input"
                  placeholder="Local Dev"
                  required
                />
              </div>
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
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="dev-label">
                    <Lock className="h-3.5 w-3.5" />
                    Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="dev-input"
                    required
                  />
                </div>
                <div>
                  <label className="dev-label">Confirm</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="dev-input pr-10"
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
              </div>

              {passwordsMismatch ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  Passwords do not match.
                </p>
              ) : null}

              <button onClick={() => {
                toast.error("use oauth")
              }}
                type="submit" disabled={isLoading || passwordsMismatch}
                className="dev-button dev-button-primary w-full">
                {isLoading ? "Generating account..." : "Create Account"}

              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-cyan-700 hover:text-cyan-900">
                Log in
              </Link>
            </p>
          </section>

          <section className="grid-canvas hidden border-l border-gray-200 p-8 md:block">
            <span className="status-pill">Developer account</span>
            <div className="chrome-card-strong mt-8 rounded-xl p-5">
              <p className="dev-label">Account can manage</p>
              <div className="space-y-3 text-sm text-gray-700">
                <p>Config endpoints for app startup.</p>
                <p>OAuth reverse routes for private IP callbacks.</p>
                <p>Client secrets for signed handoff tokens.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main >
  );
}

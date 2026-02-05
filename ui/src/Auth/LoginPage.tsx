import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Github, Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const googleOauth = async () => {
    window.location.href = "http://localhost:3000/oauth/google/login";
  };

  const githubOauth = async () => {
    window.location.href = "http://localhost:3000/oauth/github/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 selection:bg-zinc-700 selection:text-white">
      <div className="w-full max-w-[380px] space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center mb-2">
            <div className="h-5 w-5 bg-black rounded-sm rotate-45" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-zinc-500 text-sm">
            Enter your credentials to access your account
          </p>
        </div>

        {/* Social Auth */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-all duration-200"
            onClick={(e) => googleOauth()}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                opacity="0.7"
              />
            </svg>
            Google
          </Button>
          <Button
            variant="outline"
            className="bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-all duration-200"
            onClick={(e) => githubOauth()}
          >
            <Github className="w-4 h-4 mr-2" />
            GitHub
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-4 text-zinc-600 font-medium">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                size="sm"
                className="text-xs text-zinc-500 hover:text-white transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-white text-black hover:bg-zinc-200 transition-all font-semibold rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Authenticating...</span>
              </div>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-zinc-300 hover:text-white font-medium underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

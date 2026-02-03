import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Github, Eye, EyeOff, User } from "lucide-react";

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const googleOauth = async () => {
    window.location.href = "http://localhost:3000/oauth/google/login"
  }

  const githubOauth = async () => {
    window.location.href = "http://localhost:3000/oauth/github/login"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 selection:bg-zinc-700">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Create an account</h1>
          <p className="text-zinc-500">Join our community and start building</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-300"
            onClick={(e) => githubOauth()}
          >
            <Github className="w-4 h-4 mr-2" /> GitHub
          </Button>
          <Button variant="outline" className="bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-300"
            onClick={(e) => googleOauth()}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /></svg>
            Google
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-4 text-zinc-600">Secure Registration</span>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 ml-1">FULL NAME</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-white" />
                <Input
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 bg-zinc-950 border-zinc-800 text-white focus:ring-1 focus:ring-zinc-600 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 ml-1">EMAIL ADDRESS</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-white" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-zinc-950 border-zinc-800 text-white focus:ring-1 focus:ring-zinc-600 h-11"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 ml-1">PASSWORD</label>
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white focus:ring-1 focus:ring-zinc-600 h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 ml-1">CONFIRM</label>
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white focus:ring-1 focus:ring-zinc-600 h-11"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-white text-black hover:bg-zinc-200 transition-all font-bold mt-2"
          >
            {isLoading ? "Generating Account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-white hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;

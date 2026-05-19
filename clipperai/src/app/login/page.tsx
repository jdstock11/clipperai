"use client";

import { useState, FormEvent } from "react";
import { Scissors, Eye, EyeOff, ArrowRight, Mail, Lock, Zap, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    // Simulate API call — replace with real auth later
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);

    // Placeholder: just redirect to home
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 text-white relative overflow-hidden">
      {/* Extra decorative orbs for auth pages */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#00e5bf] opacity-[0.04] blur-[120px] top-[-10%] right-[10%] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#8b5cf6] opacity-[0.035] blur-[100px] bottom-[5%] left-[5%] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-10 group">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--primary)] blur-lg opacity-40 rounded-full" />
            <Scissors className="text-[var(--primary)] w-8 h-8 relative z-10 group-hover:rotate-[-15deg] transition-transform duration-300" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            ClipForge <span className="text-gradient">AI</span>
          </span>
        </Link>

        {/* Card */}
        <div className="glass-strong rounded-2xl border border-[var(--border)] p-8 relative overflow-hidden">
          {/* Glow line at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-60" />

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-[var(--muted)] text-sm font-light">
              Sign in to continue to your workspace
            </p>
          </div>

          {/* General error */}
          {errors.general && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400 shrink-0" />
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className={`relative flex items-center bg-black/30 border rounded-xl transition-colors focus-within:border-[var(--primary)] ${errors.email ? "border-red-500/50" : "border-[var(--border)]"}`}>
                <Mail className="absolute left-3.5 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="you@example.com"
                  className="w-full bg-transparent outline-none pl-11 pr-4 py-3.5 text-sm text-white placeholder-[var(--muted)] font-medium"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className={`relative flex items-center bg-black/30 border rounded-xl transition-colors focus-within:border-[var(--primary)] ${errors.password ? "border-red-500/50" : "border-[var(--border)]"}`}>
                <Lock className="absolute left-3.5 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none pl-11 pr-12 py-3.5 text-sm text-white placeholder-[var(--muted)] font-medium"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[var(--muted)] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.password}</p>}
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <button type="button" className="text-xs text-[var(--primary)] hover:underline font-medium">
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-glow py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-[var(--muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[var(--primary)] font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Bottom link */}
        <p className="text-center mt-6 text-xs text-[var(--muted)] opacity-60">
          © 2026 ClipForge AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}

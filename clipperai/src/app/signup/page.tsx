"use client";

import { useState, FormEvent } from "react";
import { Scissors, Eye, EyeOff, ArrowRight, Mail, Lock, User, Zap, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    else if (name.trim().length < 2) e.name = "Name must be at least 2 characters";

    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";

    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(password)) e.password = "Password needs an uppercase letter";
    else if (!/\d/.test(password)) e.password = "Password needs a number";

    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error || 'Signup failed' });
        setIsLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strengthPercent = password.length === 0 ? 0 : (passwordStrength / PASSWORD_RULES.length) * 100;
  const strengthColor =
    strengthPercent <= 33 ? "bg-red-500" : strengthPercent <= 66 ? "bg-yellow-500" : "bg-emerald-500";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 text-white relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#8b5cf6] opacity-[0.04] blur-[120px] top-[-5%] left-[15%] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#00e5bf] opacity-[0.035] blur-[100px] bottom-[0%] right-[10%] pointer-events-none" />

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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" />

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Create Account</h1>
            <p className="text-[var(--muted)] text-sm font-light">
              Start creating viral clips in seconds
            </p>
          </div>

          {/* General error */}
          {errors.general && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400 shrink-0" />
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                Full Name
              </label>
              <div className={`relative flex items-center bg-black/30 border rounded-xl transition-colors focus-within:border-[var(--primary)] ${errors.name ? "border-red-500/50" : "border-[var(--border)]"}`}>
                <User className="absolute left-3.5 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
                  placeholder="John Doe"
                  className="w-full bg-transparent outline-none pl-11 pr-4 py-3 text-sm text-white placeholder-[var(--muted)] font-medium"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
              {errors.name && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className={`relative flex items-center bg-black/30 border rounded-xl transition-colors focus-within:border-[var(--primary)] ${errors.email ? "border-red-500/50" : "border-[var(--border)]"}`}>
                <Mail className="absolute left-3.5 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }}
                  placeholder="you@example.com"
                  className="w-full bg-transparent outline-none pl-11 pr-4 py-3 text-sm text-white placeholder-[var(--muted)] font-medium"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className={`relative flex items-center bg-black/30 border rounded-xl transition-colors focus-within:border-[var(--primary)] ${errors.password ? "border-red-500/50" : "border-[var(--border)]"}`}>
                <Lock className="absolute left-3.5 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: "" })); }}
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none pl-11 pr-12 py-3 text-sm text-white placeholder-[var(--muted)] font-medium"
                  disabled={isLoading}
                  autoComplete="new-password"
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

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${strengthColor}`}
                      style={{ width: `${strengthPercent}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {PASSWORD_RULES.map((rule) => (
                      <span
                        key={rule.label}
                        className={`text-[10px] font-medium flex items-center gap-1 transition-colors ${
                          rule.test(password) ? "text-emerald-400" : "text-[var(--muted)]"
                        }`}
                      >
                        <Check className={`w-3 h-3 ${rule.test(password) ? "opacity-100" : "opacity-30"}`} />
                        {rule.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm" className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className={`relative flex items-center bg-black/30 border rounded-xl transition-colors focus-within:border-[var(--primary)] ${errors.confirmPassword ? "border-red-500/50" : "border-[var(--border)]"}`}>
                <Lock className="absolute left-3.5 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="signup-confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: "" })); }}
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none pl-11 pr-12 py-3 text-sm text-white placeholder-[var(--muted)] font-medium"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 text-[var(--muted)] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-glow py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
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

          {/* Login link */}
          <p className="text-center text-sm text-[var(--muted)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--primary)] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-[var(--muted)] opacity-60">
          © 2026 ClipForge AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}

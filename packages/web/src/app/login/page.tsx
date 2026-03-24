"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-[380px] bg-card p-10 flex flex-col">
        {/* Branding & Title */}
        <div className="mb-8">
          <span className="block text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-2">
            Claw Agent
          </span>
          <h1 className="text-[24px] font-semibold text-foreground tracking-tight">
            欢迎回来
          </h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Username Field */}
          <div className="flex flex-col gap-1.5 mb-5">
            <label
              htmlFor="username"
              className="text-[13px] text-muted-foreground tracking-wide"
            >
              用户名
            </label>
            <input
              id="username"
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="h-[44px] bg-input border border-border rounded-lg px-4 text-foreground placeholder-weak-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all duration-200"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5 mb-7">
            <label
              htmlFor="password"
              className="text-[13px] text-muted-foreground tracking-wide"
            >
              密码
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-[44px] bg-input border border-border rounded-lg px-4 pr-10 text-foreground placeholder-weak-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-weak-foreground hover:text-muted-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="h-[44px] bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        {/* Card Footer */}
        <div className="mt-6 flex justify-center gap-1.5 text-[13px] tracking-wide">
          <span className="text-muted-foreground">还没有账号？</span>
          <Link
            href="/register"
            className="text-foreground font-medium hover:underline transition-all"
          >
            注册
          </Link>
        </div>
      </div>
    </div>
  );
}

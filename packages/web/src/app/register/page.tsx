"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.length < 3 || username.length > 20) {
      setError("用户名长度应为 3-20 个字符");
      return;
    }
    if (password.length < 6) {
      setError("密码长度至少为 6 个字符");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      await register(username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-[380px] bg-card p-10 flex flex-col">
        {/* Brand Identity */}
        <div className="mb-8">
          <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
            CLAW AGENT
          </span>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            创建账号
          </h1>
        </div>

        {/* Register Form */}
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
              placeholder="3-20个字符"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="h-[44px] bg-input border border-border rounded-lg px-4 text-foreground placeholder-weak-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all duration-200"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5 mb-5">
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
                placeholder="至少6个字符"
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

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-1.5 mb-7">
            <label
              htmlFor="confirmPassword"
              className="text-[13px] text-muted-foreground tracking-wide"
            >
              确认密码
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full h-[44px] bg-input border border-border rounded-lg px-4 pr-10 text-foreground placeholder-weak-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-weak-foreground hover:text-muted-foreground transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            className="h-[44px] bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        {/* Footer inside card */}
        <div className="mt-6 flex justify-center gap-1.5 text-[13px] tracking-wide">
          <span className="text-muted-foreground">已有账号？</span>
          <Link
            href="/login"
            className="text-foreground font-medium hover:underline transition-all"
          >
            登录
          </Link>
        </div>
      </div>
    </div>
  );
}

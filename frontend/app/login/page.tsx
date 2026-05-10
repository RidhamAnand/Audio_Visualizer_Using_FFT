"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.login({ email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-10 text-center">
          <Link href="/" className="flex justify-center mb-6 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-sm group-hover:scale-110 transition"></div>
          </Link>
          <h1 className="text-3xl font-bold font-space-grotesk tracking-tight mb-2">Sign In</h1>
          <p className="text-white/60 text-sm">Access your SonicLab workspace</p>
        </div>

        {/* Form Card */}
        <div className="rounded-lg border border-purple-900/30 bg-black/50 backdrop-blur p-7 space-y-5">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-white block mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full h-9 rounded-md border border-purple-900/40 bg-white/5 px-3 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-white block mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-9 rounded-md border border-purple-900/40 bg-white/5 px-3 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-600/10 border border-red-600/30 p-3">
                <p className="text-xs text-red-400 font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-sm rounded-md transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-purple-900/20"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-black text-xs text-white/60">New user?</span>
            </div>
          </div>

          <Link href="/register">
            <Button
              type="button"
              className="w-full h-9 border border-purple-900/40 text-white hover:bg-purple-600/10 bg-transparent text-sm font-medium rounded-md transition"
            >
              Create Account
            </Button>
          </Link>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          <Link href="/" className="hover:text-white/60 transition">
            Back to home
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

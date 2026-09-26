"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { migrateGuestResults } from "@/lib/guestResults";

const PERKS = [
  { text: "Save your progress", icon: "M20 6L9 17l-5-5" },
  { text: "Track your stats", icon: "M3 3v18h18M8 17V9M13 17V5M18 17v-7" },
  { text: "Join challenges", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { text: "Get personalized coaching", icon: "M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" }
];

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    // Full navigation, not router.push + router.refresh(): AppShell now
    // only fetches the signed-in session once on mount (see app/api/me),
    // so it needs to actually remount to pick up the new session.
    await migrateGuestResults();
    window.location.href = "/";
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="card grid md:grid-cols-2 overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="mb-8" style={{ color: "var(--text-dim)" }}>
            Sign in to continue your typing journey.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1.5">Email or username</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold">Password</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              />
            </div>

            {error && <p className="text-sm" style={{ color: "var(--red-500)" }}>{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary rounded-xl py-3 font-semibold mt-2">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-sm mt-6 text-center" style={{ color: "var(--text-dim)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold" style={{ color: "var(--blue-500)" }}>
              Sign up
            </Link>
          </p>
        </div>

        <div className="hidden md:flex flex-col justify-center p-8 relative overflow-hidden" style={{ background: "var(--hero-grad)" }}>
          <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full opacity-30 -z-10" style={{ background: "#fff", filter: "blur(50px)" }} />
          <p className="relative text-white/80 text-sm font-semibold mb-2">New to TypeNest?</p>
          <h2 className="relative text-white text-2xl font-bold mb-6 leading-snug">
            Create your account and unlock your full potential.
          </h2>
          <ul className="relative flex flex-col gap-3">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-white text-sm font-medium">
                <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d={p.icon} />
                  </svg>
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

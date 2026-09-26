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

export default function SignupPage() {
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (username.length < 3) {
      setError("Username needs to be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`
      }
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // The trigger in 0001_profiles_and_settings.sql creates a random
    // placeholder username automatically. Overwrite it with the one the
    // person chose, once we have a session (or after email confirmation).
    if (data.user) {
      await supabase.from("profiles").update({ username }).eq("id", data.user.id);
    }

    if (data.session) {
      // Full navigation so AppShell remounts and picks up the new
      // session via /api/me (see the note on this pattern in TopBar).
      await migrateGuestResults();
      window.location.href = "/";
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Check your inbox</h1>
        <p style={{ color: "var(--text-dim)" }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="card grid md:grid-cols-2 overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="mb-8" style={{ color: "var(--text-dim)" }}>
            Free forever. No card needed.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1.5">Username</label>
              <input
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Pick a username"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--text-dim)" }}>
                Use 8+ characters. Mixing in a number or symbol makes it much harder to guess.
              </p>
            </div>

            {error && <p className="text-sm" style={{ color: "var(--red-500)" }}>{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary rounded-xl py-3 font-semibold mt-2">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-sm mt-6 text-center" style={{ color: "var(--text-dim)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--blue-500)" }}>
              Sign in
            </Link>
          </p>
        </div>

        <div className="hidden md:flex flex-col justify-center p-8 relative overflow-hidden" style={{ background: "var(--hero-grad)" }}>
          <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full opacity-30 -z-10" style={{ background: "#fff", filter: "blur(50px)" }} />
          <p className="relative text-white/80 text-sm font-semibold mb-2">Join TypeNest</p>
          <h2 className="relative text-white text-2xl font-bold mb-6 leading-snug">
            Type Faster, Think Sharper, Build Your Nest.
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

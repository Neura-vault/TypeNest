"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface TopBarProps {
  isLoggedIn: boolean;
  profile: { username: string; level: number; xp: number } | null;
  onMenuClick: () => void;
  onSearchClick: () => void;
  onThemeToggle: () => void;
}

export default function TopBar({
  isLoggedIn,
  profile,
  onMenuClick,
  onSearchClick,
  onThemeToggle
}: TopBarProps) {
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    // A full navigation (not router.refresh()) so AppShell remounts and
    // re-fetches /api/me — it now only fetches the session once on mount,
    // since layout.tsx no longer does that DB round-trip on every request.
    window.location.href = "/";
  }

  return (
    <header
      className="sticky top-0 z-40 h-[72px] flex items-center gap-3.5 px-7 backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--bg) 86%, transparent)", borderBottom: "1px solid var(--border)" }}
    >
      <button
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 rounded-xl border flex items-center justify-center"
        style={{ borderColor: "var(--border)" }}
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <button
        onClick={onSearchClick}
        className="flex items-center gap-2.5 flex-1 max-w-[380px] px-4 py-2.5 rounded-full border text-sm text-left transition-colors hover:border-[var(--blue-500)]"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-dim)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span className="flex-1 hidden sm:inline">Search anything…</span>
        <kbd className="hidden sm:inline text-[11px] font-bold border rounded-md px-1.5 py-0.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center gap-2.5 ml-auto">
        {profile && (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 h-10 rounded-full text-xs font-bold text-white"
            style={{ background: "var(--amber-grad)", boxShadow: "var(--shadow-glow-amber)" }}
          >
            <span className="opacity-90">Lv {profile.level}</span>
            <span className="w-1 h-1 rounded-full bg-white/70" />
            <span>{profile.xp} XP</span>
          </span>
        )}

        <button
          onClick={onThemeToggle}
          className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors hover:border-[var(--blue-500)]"
          style={{ borderColor: "var(--border)" }}
          aria-label="Toggle theme"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </button>

        {isLoggedIn ? (
          <>
            <Link href="/profile" className="hidden sm:flex items-center gap-2 pl-1 pr-3.5 py-1 rounded-full transition-colors hover:bg-[var(--surface-2)]">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: "var(--brand-grad)" }}
              >
                {profile?.username?.[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="text-sm font-semibold">{profile?.username ?? "Account"}</span>
            </Link>
            <button onClick={handleSignOut} className="btn-ghost text-sm font-semibold px-4 py-2.5 rounded-full">
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-ghost hidden sm:inline-block text-sm font-semibold px-4 py-2.5 rounded-full">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary text-sm font-semibold px-5 py-2.5 rounded-full">
              Get Started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

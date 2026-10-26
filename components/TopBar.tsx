"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";
import { createClient } from "@/lib/supabase/client";

const PRIMARY = [
  { href: "/practice", label: "Practice" },
  { href: "/train", label: "Train" },
  { href: "/academy", label: "Academy" },
  { href: "/games", label: "Games" },
  { href: "/compete", label: "Compete" },
  { href: "/leaderboard", label: "Leaderboard" }
];
const MORE = [
  { href: "/stats", label: "Stats", hint: "Your history and trends" },
  { href: "/missions", label: "Missions", hint: "Daily goals and XP" },
  { href: "/friends", label: "Friends", hint: "Add players and race them" },
  { href: "/teams", label: "Teams", hint: "Type with your crew" },
  { href: "/multiplayer", label: "Multiplayer", hint: "Tournaments and brackets" },
  { href: "/profile", label: "Profile", hint: "Your public page" },
  { href: "/settings", label: "Settings", hint: "Themes, sound, caret" }
];

interface TopBarProps {
  isLoggedIn: boolean;
  profile: { username: string; level: number; xp: number; avatar_url?: string | null } | null;
  onMenuClick?: () => void;
  onSearchClick: () => void;
  onThemeToggle: () => void;
}

export default function TopBar({ isLoggedIn, profile, onSearchClick, onThemeToggle }: TopBarProps) {
  const supabase = createClient();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const moreActive = MORE.some((m) => isActive(m.href));

  async function handleSignOut() {
    await supabase.auth.signOut();
    // Full navigation so AppShell remounts and re-fetches /api/me.
    window.location.href = "/";
  }

  const closeMore = (e: React.MouseEvent) =>
    (e.currentTarget as HTMLElement).closest("details")?.removeAttribute("open");

  return (
    <header className="tn-nav">
      <div className="tn-nav-row">
        <Link href="/" className="tn-brand" aria-label="TypeNest home">
          <Image src="/logo.png" alt="TypeNest" width={112} height={28} priority />
        </Link>

        <nav className="tn-links" aria-label="Main">
          {PRIMARY.map((l) => (
            <Link key={l.href} href={l.href} className="tn-link" data-active={isActive(l.href)}>
              {l.label}
            </Link>
          ))}
          <details className="tn-more">
            <summary className="tn-link" data-active={moreActive}>
              More <span aria-hidden>▾</span>
            </summary>
            <div className="tn-menu">
              {MORE.map((m) => (
                <Link key={m.href} href={m.href} onClick={closeMore} data-active={isActive(m.href)}>
                  <b>{m.label}</b>
                  <span>{m.hint}</span>
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="tn-actions">
          <button onClick={onSearchClick} className="tn-search" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden md:inline">Ctrl K</kbd>
          </button>

          {profile && (
            <span className="tn-xp hidden sm:inline-flex">
              LV {profile.level}<i /> {profile.xp} XP
            </span>
          )}

          <button onClick={onThemeToggle} className="tn-icon" aria-label="Toggle theme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </button>

          {isLoggedIn ? (
            <>
              <Link href="/profile" aria-label="Profile">
                <Avatar url={profile?.avatar_url} name={profile?.username ?? "?"} size={36} />
              </Link>
              <button onClick={handleSignOut} className="btn-ghost tn-btn">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost tn-btn hidden sm:inline-block">Sign in</Link>
              <Link href="/signup" className="btn-primary tn-btn">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

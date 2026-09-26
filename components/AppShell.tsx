"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CommandPalette from "./CommandPalette";
import { SettingsProvider, useSettings, type Theme } from "@/lib/settingsContext";

const THEME_ORDER: Theme[] = ["aurora", "midnight", "cyber", "ocean", "forest", "sunset"];

interface Session {
  isLoggedIn: boolean;
  profile: { username: string; level: number; xp: number } | null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ isLoggedIn: false, profile: null });
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Fetched client-side on mount instead of blocking every server render —
  // see app/api/me/route.ts for why. Runs once on first load; login/
  // signup/sign out all do a full page navigation afterward specifically
  // so this remounts and re-fetches (see the note in TopBar).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: Session) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        // Not signed in, or a network hiccup — the shell already defaults
        // to the signed-out view, so there's nothing more to do.
      })
      .finally(() => {
        if (!cancelled) setSessionLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Wait for the session before deciding whether settings load from the
  // server or localStorage — starting the settings fetch too early would
  // sometimes catch it signed-out on a refresh and load the wrong source.
  if (!sessionLoaded) {
    return <AppShellInner session={session} isLoggedIn={false}>{children}</AppShellInner>;
  }

  return (
    <SettingsProvider isLoggedIn={session.isLoggedIn}>
      <AppShellInner session={session} isLoggedIn={session.isLoggedIn}>
        {children}
      </AppShellInner>
    </SettingsProvider>
  );
}

function AppShellInner({
  session,
  isLoggedIn,
  children
}: {
  session: Session;
  isLoggedIn: boolean;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { settings, update } = useSettings();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(settings.theme) + 1) % THEME_ORDER.length];
    update({ theme: next });
  }

  return (
    <div className={`flex min-h-screen items-stretch ${settings.focusMode ? "focus-mode" : ""}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 min-w-0 flex-col">
        <TopBar
          isLoggedIn={isLoggedIn}
          profile={session.profile}
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setPaletteOpen(true)}
          onThemeToggle={cycleTheme}
        />
        <main className="mx-auto w-full max-w-[1200px] px-6 flex-1 py-8">{children}</main>
        <footer className="border-t mt-10 py-7" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-[1200px] px-6 flex items-center justify-between flex-wrap gap-4">
            <span className="font-heading font-bold">TypeNest</span>
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              © {new Date().getFullYear()} TypeNest. Don&apos;t just test your typing. Build it.
            </p>
          </div>
        </footer>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

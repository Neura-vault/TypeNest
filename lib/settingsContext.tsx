"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type Theme = "aurora" | "midnight" | "cyber" | "ocean" | "forest" | "sunset";

export interface Settings {
  theme: Theme;
  fontSize: number;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  reducedMotion: boolean;
  focusMode: boolean;
}

const DEFAULTS: Settings = {
  theme: "aurora",
  fontSize: 16,
  soundEnabled: true,
  animationsEnabled: true,
  reducedMotion: false,
  focusMode: false
};

const LOCAL_KEY = "typenest-settings";

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
  loaded: false
});

export function SettingsProvider({ children, isLoggedIn }: { children: React.ReactNode; isLoggedIn: boolean }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once: from the server if signed in (source of truth), otherwise
  // from localStorage (a guest's only place to keep a preference at all).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isLoggedIn) {
        try {
          const res = await fetch("/api/settings");
          const data = await res.json();
          if (!cancelled && data.settings) setSettings({ ...DEFAULTS, ...data.settings });
        } catch {
          // Fall through to defaults — not worth blocking the page over.
        }
      } else if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(LOCAL_KEY);
          if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
        } catch {
          // Corrupt localStorage value — just use defaults.
        }
      }
      if (!cancelled) setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Apply visible effects to the document as soon as settings change.
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.setAttribute("data-theme", settings.theme);
    document.documentElement.style.setProperty("--user-font-size", `${settings.fontSize}px`);
    document.documentElement.classList.toggle("reduced-motion", settings.reducedMotion || !settings.animationsEnabled);
  }, [settings, loaded]);

  function update(patch: Partial<Settings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (isLoggedIn) {
        // Debounced so dragging a slider doesn't fire a request per pixel.
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch)
          }).catch(() => {});
        }, 400);
      } else if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        } catch {
          // Storage unavailable — the in-memory state above still works
          // for the rest of this session either way.
        }
      }
      return next;
    });
  }

  return <SettingsContext.Provider value={{ settings, update, loaded }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

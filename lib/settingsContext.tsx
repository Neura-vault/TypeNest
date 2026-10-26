"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type Theme = "aurora" | "midnight" | "cyber" | "ocean" | "forest" | "sunset" | "graphite" | "paper" | "rose" | "lavender" | "mint" | "sand" | "slate" | "ink";

export interface TypingPrefs {
  caretStyle: "line" | "block" | "underline";
  smoothCaret: boolean;
  blindMode: boolean;
  stopOnError: boolean;
  liveStats: "full" | "minimal" | "off";
  autoTheme: boolean;
  difficulty: "normal" | "expert" | "master";
  minWpm: number;
  minAccuracy: number;
}

export const DEFAULT_TYPING: TypingPrefs = {
  caretStyle: "line",
  smoothCaret: false,
  blindMode: false,
  stopOnError: false,
  liveStats: "full",
  autoTheme: false,
  difficulty: "normal",
  minWpm: 0,
  minAccuracy: 0
};

export interface Settings {
  theme: Theme;
  fontSize: number;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  reducedMotion: boolean;
  focusMode: boolean;
  typing: TypingPrefs;
}

const DEFAULTS: Settings = {
  theme: "aurora",
  fontSize: 16,
  soundEnabled: true,
  animationsEnabled: true,
  reducedMotion: false,
  focusMode: false,
  typing: DEFAULT_TYPING
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
          if (!cancelled && data.settings) setSettings({ ...DEFAULTS, ...data.settings, typing: { ...DEFAULT_TYPING, ...(data.settings.typing ?? {}) } });
        } catch {
          // Fall through to defaults — not worth blocking the page over.
        }
      } else if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(LOCAL_KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            setSettings({ ...DEFAULTS, ...saved, typing: { ...DEFAULT_TYPING, ...(saved.typing ?? {}) } });
          }
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
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () =>
      root.setAttribute("data-theme", settings.typing.autoTheme ? (media.matches ? "midnight" : "aurora") : settings.theme);
    applyTheme();
    media.addEventListener("change", applyTheme);
    root.setAttribute("data-caret", settings.typing.caretStyle);
    root.setAttribute("data-smooth", String(settings.typing.smoothCaret));
    document.documentElement.style.setProperty("--user-font-size", `${settings.fontSize}px`);
    document.documentElement.classList.toggle("reduced-motion", settings.reducedMotion || !settings.animationsEnabled);
    return () => media.removeEventListener("change", applyTheme);
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

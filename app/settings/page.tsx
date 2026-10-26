"use client";

import ApiKeysCard from "@/components/ApiKeysCard";
import DeleteAccountCard from "@/components/DeleteAccountCard";
import TypingPrefsCard from "@/components/TypingPrefsCard";
import { useSettings, type Theme } from "@/lib/settingsContext";
import { playKeySound } from "@/lib/sounds";

const THEME_OPTIONS: { id: Theme; label: string; swatch: [string, string] }[] = [
  { id: "aurora", label: "Aurora", swatch: ["#ffffff", "#2340ff"] },
  { id: "midnight", label: "Midnight", swatch: ["#08090c", "#6f88ff"] },
  { id: "cyber", label: "Cyber", swatch: ["#0a0a16", "#8b6cff"] },
  { id: "ocean", label: "Ocean", swatch: ["#f3fafb", "#087a93"] },
  { id: "forest", label: "Forest", swatch: ["#f4f9f4", "#237a37"] },
  { id: "sunset", label: "Sunset", swatch: ["#fff8f3", "#d63a62"] },
  { id: "graphite", label: "Graphite", swatch: ["#f2f2f3", "#3a3a40"] },
  { id: "paper", label: "Paper", swatch: ["#faf6ee", "#a8522b"] },
  { id: "rose", label: "Rose", swatch: ["#fff5f7", "#d6336c"] },
  { id: "lavender", label: "Lavender", swatch: ["#f7f4ff", "#7048e8"] },
  { id: "mint", label: "Mint", swatch: ["#f1faf6", "#0b8563"] },
  { id: "sand", label: "Sand", swatch: ["#f8f4ec", "#a8620a"] },
  { id: "slate", label: "Slate", swatch: ["#10141c", "#5ea1ff"] },
  { id: "ink", label: "Ink", swatch: ["#000000", "#ffffff"] }
];

export default function SettingsPage() {
  const { settings, update, loaded } = useSettings();

  if (!loaded) {
    return <div className="py-8 text-sm" style={{ color: "var(--text-dim)" }}>Loading settings…</div>;
  }

  return (
    <div className="pt-2 pb-8">
      <h1 className="font-bold">Settings</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-dim)" }}>Customize your TypeNest experience.</p>

      <div className="st-cols">
<TypingPrefsCard />
<ApiKeysCard />
<section className="card p-6 mb-5">
        <h2 className="font-semibold mb-1">Appearance</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>Pick a theme. Changes apply instantly.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => update({ theme: t.id })}
              className="rounded-xl p-3 border-2 text-left transition-colors"
              style={{ borderColor: settings.theme === t.id ? "var(--blue-500)" : "var(--border)" }}
            >
              <div className="flex gap-1.5 mb-2.5">
                <span className="w-6 h-6 rounded-full border" style={{ background: t.swatch[0], borderColor: "var(--border)" }} />
                <span className="w-6 h-6 rounded-full" style={{ background: t.swatch[1] }} />
              </div>
              <span className="text-sm font-semibold">{t.label}</span>
              {settings.theme === t.id && <span className="ml-2 text-xs" style={{ color: "var(--blue-500)" }}>Active</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-6 mb-5">
        <h2 className="font-semibold mb-4">Typing</h2>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">Text size</label>
          <span className="text-sm font-mono" style={{ color: "var(--text-dim)" }}>{settings.fontSize}px</span>
        </div>
        <input
          type="range"
          min={12}
          max={24}
          step={1}
          value={settings.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </section>

      <section className="card p-6 mb-5">
        <h2 className="font-semibold mb-4">Audio</h2>
        <ToggleRow
          label="Keystroke sounds"
          description="A soft click for each key, a lower tone for mistakes."
          checked={settings.soundEnabled}
          onChange={(v) => {
            update({ soundEnabled: v });
            if (v) playKeySound();
          }}
        />
      </section>

      <section className="card p-6">
        <h2 className="font-semibold mb-4">Accessibility</h2>
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          <ToggleRow
            label="Interface animations"
            description="Hover effects, transitions, and motion throughout the app."
            checked={settings.animationsEnabled}
            onChange={(v) => update({ animationsEnabled: v })}
          />
          <ToggleRow
            label="Reduce motion"
            description="Minimizes animation for motion sensitivity, overriding the above."
            checked={settings.reducedMotion}
            onChange={(v) => update({ reducedMotion: v })}
          />
          <ToggleRow
            label="Focus mode"
            description="Dims the sidebar and top bar so the typing area stands alone. Hover to bring them back."
            checked={settings.focusMode}
            onChange={(v) => update({ focusMode: v })}
          />
        </div>
      </section>
<DeleteAccountCard />
</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className="shrink-0 w-11 h-6 rounded-full relative transition-colors"
        style={{ background: checked ? "var(--blue-500)" : "var(--surface-3)" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}

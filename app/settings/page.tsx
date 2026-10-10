"use client";

import { useSettings, type Theme } from "@/lib/settingsContext";
import { playKeySound } from "@/lib/sounds";

const THEME_OPTIONS: { id: Theme; label: string; swatch: [string, string] }[] = [
  { id: "aurora", label: "Aurora", swatch: ["#f5f7fc", "#1e6fef"] },
  { id: "midnight", label: "Midnight", swatch: ["#060810", "#1e6fef"] },
  { id: "cyber", label: "Cyber", swatch: ["#0a0a18", "#7c5cf0"] },
  { id: "ocean", label: "Ocean", swatch: ["#f0f9fb", "#0891b2"] },
  { id: "forest", label: "Forest", swatch: ["#f3f8f3", "#2f9e44"] },
  { id: "sunset", label: "Sunset", swatch: ["#fff6f0", "#f0568c"] }
];

export default function SettingsPage() {
  const { settings, update, loaded } = useSettings();

  if (!loaded) {
    return <div className="py-8 text-sm" style={{ color: "var(--text-dim)" }}>Loading settings…</div>;
  }

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-dim)" }}>Customize your TypeNest experience.</p>

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
              {settings.theme === t.id && <span className="ml-2 text-xs" style={{ color: "var(--blue-500)" }}>✓ Active</span>}
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

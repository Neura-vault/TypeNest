"use client";

import { useSettings, type TypingPrefs } from "@/lib/settingsContext";

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className="tp-switch" onClick={() => onChange(!on)} />;
}

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="pd-tabs">
      {options.map((o) => (
        <button key={o.id} data-on={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

function Num({ value, options, unit, onChange }: { value: number; options: number[]; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="pd-tabs">
      {options.map((o) => (
        <button key={o} data-on={value === o} onClick={() => onChange(o)}>{o === 0 ? "Off" : `${o}${unit}`}</button>
      ))}
    </div>
  );
}

export default function TypingPrefsCard() {
  const { settings, update } = useSettings();
  const t = settings.typing;
  const set = (patch: Partial<TypingPrefs>) => update({ typing: { ...t, ...patch } });

  return (
    <section className="card px-5 pt-5 pb-2 mb-5">
      <h3 className="font-semibold mb-1">Typing</h3>
      <p className="pd-lab">How the typing test looks and behaves. Saved to your account.</p>
      <div className="tp-row">
        <div><b>Caret style</b><small>The marker that shows where you are.</small></div>
        <Choice value={t.caretStyle} onChange={(v) => set({ caretStyle: v })} options={[{ id: "line", label: "Line" }, { id: "block", label: "Block" }, { id: "underline", label: "Underline" }]} />
      </div>
      <div className="tp-row">
        <div><b>Smooth caret</b><small>The caret glides between letters instead of jumping.</small></div>
        <Switch on={t.smoothCaret} onChange={(v) => set({ smoothCaret: v })} label="Smooth caret" />
      </div>
      <div className="tp-row">
        <div><b>Live stats</b><small>What you see while typing. Hide them if watching your speed makes you tense.</small></div>
        <Choice value={t.liveStats} onChange={(v) => set({ liveStats: v })} options={[{ id: "full", label: "All" }, { id: "minimal", label: "WPM" }, { id: "off", label: "Off" }]} />
      </div>
      <div className="tp-row">
        <div><b>Blind mode</b><small>Mistakes are not shown in red. You see the result at the end.</small></div>
        <Switch on={t.blindMode} onChange={(v) => set({ blindMode: v })} label="Blind mode" />
      </div>
      <div className="tp-row">
        <div><b>Stop on error</b><small>A wrong letter is ignored until you press the right one.</small></div>
        <Switch on={t.stopOnError} onChange={(v) => set({ stopOnError: v })} label="Stop on error" />
      </div>
      <div className="tp-row">
        <div><b>Difficulty</b><small>Expert: the test fails if you move on from a word with a mistake. Master: it fails on the first wrong key.</small></div>
        <Choice value={t.difficulty} onChange={(v) => set({ difficulty: v })} options={[{ id: "normal", label: "Normal" }, { id: "expert", label: "Expert" }, { id: "master", label: "Master" }]} />
      </div>
      <div className="tp-row">
        <div><b>Fail below this speed</b><small>The test restarts if your speed drops under the limit (checked after the first 5 seconds).</small></div>
        <Num value={t.minWpm} options={[0, 20, 40, 60, 80]} unit=" WPM" onChange={(v) => set({ minWpm: v })} />
      </div>
      <div className="tp-row">
        <div><b>Fail below this accuracy</b><small>The test restarts if accuracy drops under the limit.</small></div>
        <Num value={t.minAccuracy} options={[0, 85, 90, 95, 98]} unit="%" onChange={(v) => set({ minAccuracy: v })} />
      </div>
      <div className="tp-row">
        <div><b>Match my device theme</b><small>Light theme by day, dark theme when your device is in dark mode.</small></div>
        <Switch on={t.autoTheme} onChange={(v) => set({ autoTheme: v })} label="Match device theme" />
      </div>
    </section>
  );
}

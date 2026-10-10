// Visual QWERTY heatmap built from char_stats — data the app has already
// been collecting since migration 0015. No schema change, purely a new
// way to look at data that's already there.

interface CharStat {
  char: string;
  attempts: number;
  errors: number;
}

const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"]
];

const MIN_ATTEMPTS = 3;

function heatStyle(attempts: number, errors: number): { background: string; color: string } {
  if (attempts < MIN_ATTEMPTS) {
    return { background: "var(--surface-2)", color: "var(--text-dim)" };
  }

  const rate = errors / attempts;

  if (rate < 0.06) {
    return { background: "color-mix(in srgb, var(--teal-500) 22%, var(--surface-2))", color: "var(--text)" };
  }
  if (rate < 0.12) {
    return { background: "color-mix(in srgb, var(--teal-500) 48%, var(--surface-2))", color: "var(--text)" };
  }
  if (rate < 0.2) {
    return { background: "color-mix(in srgb, var(--amber-500) 55%, var(--surface-2))", color: "#3a1a0f" };
  }
  if (rate < 0.3) {
    return { background: "var(--amber-500)", color: "#fff" };
  }
  return { background: "var(--red-500)", color: "#fff" };
}

export default function KeyboardHeatmap({ charStats }: { charStats: CharStat[] }) {
  const byChar = new Map(charStats.map((c) => [c.char.toLowerCase(), c]));
  const hasEnoughData = charStats.some((c) => c.attempts >= MIN_ATTEMPTS);

  return (
    <div>
      <div className="flex flex-col items-center gap-1.5">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1.5" style={{ marginLeft: ri * 13 }}>
            {row.map((k) => {
              const s = byChar.get(k);
              const style = heatStyle(s?.attempts ?? 0, s?.errors ?? 0);
              const pct = s && s.attempts >= MIN_ATTEMPTS ? Math.round((s.errors / s.attempts) * 100) : null;

              return (
                <div
                  key={k}
                  title={
                    pct !== null
                      ? `${k.toUpperCase()} — ${pct}% miss rate (${s?.attempts} attempts)`
                      : `${k.toUpperCase()} — not enough data yet`
                  }
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold uppercase select-none"
                  style={{ ...style, border: "1px solid var(--border)" }}
                >
                  {k}
                </div>
              );
            })}
          </div>
        ))}

        <div
          className="h-8 mt-0.5 rounded-lg flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide"
          style={{ width: 220, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
        >
          space
        </div>
      </div>

      {hasEnoughData ? (
        <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px]" style={{ color: "var(--text-dim)" }}>
          <span>Accurate</span>
          <Swatch color="color-mix(in srgb, var(--teal-500) 22%, var(--surface-2))" />
          <Swatch color="color-mix(in srgb, var(--teal-500) 48%, var(--surface-2))" />
          <Swatch color="color-mix(in srgb, var(--amber-500) 55%, var(--surface-2))" />
          <Swatch color="var(--amber-500)" />
          <Swatch color="var(--red-500)" />
          <span>Error-prone</span>
        </div>
      ) : (
        <p className="text-sm text-center mt-4" style={{ color: "var(--text-dim)" }}>
          Complete a few more tests — each key colors in once it&apos;s been typed enough to mean something.
        </p>
      )}
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block w-3.5 h-3.5 rounded" style={{ background: color }} />;
}

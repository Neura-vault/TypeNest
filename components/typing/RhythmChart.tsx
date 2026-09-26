// Renders the WPM-over-time line for a single just-completed test, so the
// result screen shows the journey ("where did I slow down?") instead of
// only the final number. Data comes from in-memory samples collected
// during the test itself — nothing new is persisted for this, so it's a
// zero-schema, zero-risk addition to the results screen.

export default function RhythmChart({ data }: { data: number[] }) {
  if (!data || data.length < 3) {
    return (
      <p
        className="text-sm text-center py-6"
        style={{ color: "var(--text-dim)" }}
      >
        Take a slightly longer test to see your speed rhythm here.
      </p>
    );
  }

  const w = 600;
  const h = 150;
  const pad = 8;
  const max = Math.max(...data, 1);

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y] as [number, number];
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${h - pad} L ${points[0][0].toFixed(1)} ${h - pad} Z`;

  const avg = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
  const peak = Math.round(max);

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 130, display: "block" }}
      >
        <defs>
          <linearGradient id="rhythmFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-500)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--blue-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#rhythmFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--blue-500)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div
        className="flex justify-center gap-6 mt-2 text-xs"
        style={{ color: "var(--text-dim)" }}
      >
        <span>
          Peak{" "}
          <strong style={{ color: "var(--text)" }}>{peak} WPM</strong>
        </span>
        <span>
          Average{" "}
          <strong style={{ color: "var(--text)" }}>{avg} WPM</strong>
        </span>
      </div>
    </div>
  );
}

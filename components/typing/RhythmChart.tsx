// Renders the WPM-over-time line for a single just-completed test, so the
// result screen shows the journey ("where did I slow down?") instead of
// only the final number. Data comes from in-memory samples collected
// during the test itself, nothing new is persisted for this.

export default function RhythmChart({ data }: { data: number[] }) {
  if (!data || data.length < 3) {
    return <p className="rs-sub">Take a slightly longer test to see your speed rhythm here.</p>;
  }

  const w = 600;
  const h = 150;
  const pad = 8;
  const max = Math.max(...data, 1);
  const yOf = (v: number) => h - pad - (v / max) * (h - pad * 2);

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    return [x, yOf(v)] as [number, number];
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");

  const avg = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
  const peak = Math.round(max);
  const avgY = yOf(avg);

  return (
    <div className="rc-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Speed over the test. Peak ${peak} WPM, average ${avg} WPM.`}>
        <line x1={pad} x2={w - pad} y1={yOf(max)} y2={yOf(max)} className="rc-grid" vectorEffect="non-scaling-stroke" />
        <line x1={pad} x2={w - pad} y1={yOf(max / 2)} y2={yOf(max / 2)} className="rc-grid" vectorEffect="non-scaling-stroke" />
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} className="rc-grid" vectorEffect="non-scaling-stroke" />
        <line x1={pad} x2={w - pad} y1={avgY} y2={avgY} className="rc-avg" vectorEffect="non-scaling-stroke" />
        <path d={linePath} className="rc-line" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="rc-legend">
        <span>Peak <strong>{peak} WPM</strong></span>
        <span>Average <strong>{avg} WPM</strong> (dashed line)</span>
      </div>
    </div>
  );
}

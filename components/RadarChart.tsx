interface RadarItem {
  label: string;
  value: number;
}

export default function RadarChart({ items, size = 320 }: { items: RadarItem[]; size?: number }) {
  const n = items.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 90; // generous margin so side labels never clip the viewBox
  const angleStep = (2 * Math.PI) / n;

  function pointAt(i: number, radius: number): [number, number] {
    const angle = -Math.PI / 2 + i * angleStep;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  const rings = [0.25, 0.5, 0.75, 1].map((f, ri) => {
    const pts = items.map((_, i) => pointAt(i, r * f).join(",")).join(" ");
    return <polygon key={ri} points={pts} fill="none" stroke="var(--border)" strokeWidth={1} />;
  });

  const axes = items.map((_, i) => {
    const [x, y] = pointAt(i, r);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
  });

  const dataPts = items.map((it, i) => pointAt(i, r * (Math.max(0, Math.min(100, it.value)) / 100)).join(",")).join(" ");

  const dots = items.map((it, i) => {
    const [x, y] = pointAt(i, r * (Math.max(0, Math.min(100, it.value)) / 100));
    return <circle key={i} cx={x} cy={y} r={3.5} fill="var(--blue-500)" />;
  });

  const labels = items.map((it, i) => {
    const [x, y] = pointAt(i, r + 24);
    const anchor = x < cx - 4 ? "end" : x > cx + 4 ? "start" : "middle";
    return (
      <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize={10.5} fill="var(--text-dim)" fontWeight={700}>
        {it.label}
      </text>
    );
  });

  return (
    <div className="flex flex-wrap gap-6 items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: 300, display: "block" }}>
        {rings}
        {axes}
        <polygon points={dataPts} fill="rgba(30,111,239,.22)" stroke="var(--blue-500)" strokeWidth={2.5} />
        {dots}
        {labels}
      </svg>
      <div className="flex flex-col gap-2 min-w-[160px]">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--blue-500)" }} />
            <span className="w-20" style={{ color: "var(--text-dim)" }}>{it.label}</span>
            <strong>{it.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="py-10 animate-pulse">
      <div className="h-8 w-48 rounded-lg mb-6" style={{ background: "var(--surface-2)" }} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5 h-32" style={{ background: "var(--surface)" }}>
            <div className="w-11 h-11 rounded-xl mb-3" style={{ background: "var(--surface-2)" }} />
            <div className="h-3 w-3/4 rounded mb-2" style={{ background: "var(--surface-2)" }} />
            <div className="h-3 w-1/2 rounded" style={{ background: "var(--surface-2)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

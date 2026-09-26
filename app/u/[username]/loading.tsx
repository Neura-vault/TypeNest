export default function Loading() {
  return (
    <div className="py-8 max-w-2xl mx-auto animate-pulse">
      <div className="rounded-2xl p-6 mb-5 h-36" style={{ background: "var(--surface-2)" }} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 h-20" style={{ background: "var(--surface)" }} />
        ))}
      </div>
    </div>
  );
}

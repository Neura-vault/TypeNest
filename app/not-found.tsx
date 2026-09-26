import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 flex items-center justify-center">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="icon-tile lg solid tile-blue mx-auto mb-4" style={{ fontSize: 26 }}>🧭</div>
        <h1 className="text-xl font-bold mb-2">Page not found</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm">
            Go Home
          </Link>
          <Link href="/practice" className="btn-ghost px-5 py-2.5 rounded-xl font-semibold text-sm">
            Start Typing
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Best-effort — logs land in Vercel's Function Logs (see
    // app/api/log-error). If the request itself fails (offline, etc.)
    // there's nothing more useful to do than the console.error below.
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url: typeof window !== "undefined" ? window.location.href : undefined
      })
    }).catch(() => {});
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="card p-8 max-w-md w-full text-center">
        <div className="icon-tile lg solid tile-rose mx-auto mb-4" style={{ fontSize: 26 }}>⚠️</div>
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
          We hit an unexpected error. This has been logged — try again, or head back home.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm">
            Try Again
          </button>
          <Link href="/" className="btn-ghost px-5 py-2.5 rounded-xl font-semibold text-sm">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

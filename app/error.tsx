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
    <div className="nf-full">
      <div className="nf">
        <span className="nf-code">Unexpected error</span>
        <h1>Something went wrong</h1>
        <p>We hit a problem on our side and have logged it. Try again, or head back home.</p>
        <div className="nf-actions">
          <button onClick={reset} className="btn-primary tn-btn">Try again</button>
          <Link href="/" className="btn-ghost tn-btn">Go home</Link>
        </div>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { rateLimit, requestIp } from "@/lib/rateLimit";

// Minimal error monitoring: the client error boundary (app/error.tsx) posts
// here, and this just console.errors it — which Vercel already captures in
// the project's Function Logs / Runtime Logs, searchable and retained,
// without needing an external account or DSN.
//
// This is intentionally NOT a full Sentry setup: Sentry's build-time
// wiring (next.config.js source-map upload, edge/server/client config
// files, version-specific API) can't be verified without actually running
// a build against a real DSN, and getting it wrong risks breaking the
// production build. If/when the team wants alerting, grouped stack
// traces, etc., swapping this route's body for `Sentry.captureException`
// after `npx @sentry/wizard@latest -i nextjs` is a contained change —
// nothing else in the app needs to know the difference, since everything
// already reports errors through this one endpoint.
export async function POST(request: Request) {
  const limited = rateLimit(`log-error:${requestIp(request)}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    const body = await request.json();
    console.error("[client-error]", {
      message: typeof body.message === "string" ? body.message.slice(0, 500) : "unknown",
      stack: typeof body.stack === "string" ? body.stack.slice(0, 2000) : undefined,
      url: typeof body.url === "string" ? body.url.slice(0, 300) : undefined,
      digest: typeof body.digest === "string" ? body.digest : undefined
    });
  } catch {
    // Malformed body — nothing useful to log, don't error out over it.
  }

  return NextResponse.json({ ok: true });
}

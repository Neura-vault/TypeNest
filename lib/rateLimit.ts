// Lightweight per-process rate limiter. Good enough to stop naive scripted
// abuse (tight loops hitting one route) with zero extra infrastructure.
//
// Honest limitation: on Vercel serverless, each instance has its own memory,
// so a determined attacker spread across many cold-started instances gets a
// higher effective limit than the number below. For real production-grade
// limiting shared across instances, swap this for Upstash Ratelimit
// (https://github.com/upstash/ratelimit) — same call shape, backed by Redis.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Prevent unbounded memory growth from one-off IPs.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true, retryAfterSec: 0 };
}

export function requestIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

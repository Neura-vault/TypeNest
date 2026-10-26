import { createClient } from "@/lib/supabase/server";

// Rate limiter backed by Postgres (check_rate_limit), shared by all instances.
// If the database call fails it falls back to the per-process limiter below
// so a database hiccup never takes the API down.
// (Original note:) Lightweight per-process rate limiter. Good enough to stop naive scripted
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

function memoryLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
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

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfterSec: number }> {
  try {
    const { data, error } = await createClient().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row) return { ok: !!row.ok, retryAfterSec: Number(row.retry_after) || 0 };
  } catch {
    /* fall through to the in-memory limiter */
  }
  return memoryLimit(key, limit, windowMs);
}

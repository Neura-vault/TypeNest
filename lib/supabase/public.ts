import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Deliberately does NOT touch next/headers cookies(). Reading cookies in a
// Server Component marks the whole route dynamic (no caching, no static
// generation) even if the data itself doesn't depend on who's asking. For
// data that's genuinely public — the leaderboard, a public profile lookup —
// use this client instead of lib/supabase/server.ts so the page can be
// cached with `export const revalidate = ...`.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

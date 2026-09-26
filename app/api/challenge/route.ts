import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ChallengeSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`challenge:${user.id}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = ChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }
  const d = parsed.data;

  // submit_daily_challenge only pays XP on the first attempt of the day —
  // a unique (user_id, challenge_date) constraint backs this up at the DB
  // level, so even a burst of parallel requests can't double-pay.
  const { data, error } = await supabase
    .rpc("submit_daily_challenge", { p_wpm: d.wpm, p_accuracy: d.accuracy })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { xp_awarded: number; first_attempt_today: boolean };
  return NextResponse.json({ xpAwarded: row.xp_awarded, firstAttemptToday: row.first_attempt_today });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ attempts: [] });

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_challenge_attempts")
    .select("wpm, accuracy, created_at")
    .eq("user_id", user.id)
    .eq("challenge_date", today)
    .order("created_at", { ascending: true });

  return NextResponse.json({ attempts: data ?? [] });
}

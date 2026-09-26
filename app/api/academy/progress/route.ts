import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AcademyProgressSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`academy:${user.id}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // lessonId is now a strict enum — junk lesson ids can no longer create
  // rows that would inflate mission m4's "lessons passed" count.
  const parsed = AcademyProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }
  const d = parsed.data;

  // submit_lesson_progress does the read-check-write (attempts + best
  // scores + first-pass XP) as one atomic upsert instead of the previous
  // select-then-upsert, which double-counted attempts under concurrent
  // requests (e.g. a double-click or two tabs).
  const { data, error } = await supabase
    .rpc("submit_lesson_progress", { p_lesson_id: d.lessonId, p_wpm: d.wpm ?? null, p_accuracy: d.accuracy })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { passed: boolean; xp_awarded: number };
  return NextResponse.json({ passed: row.passed, xpAwarded: row.xp_awarded });
}

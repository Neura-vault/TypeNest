import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MissionClaimSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`mission-claim:${user.id}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = MissionClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }

  // claim_mission (migration 0011) re-verifies progress in SQL (sum() in
  // the database instead of downloading every row to add them up in JS),
  // then inserts the claim row and pays XP in the same transaction. The
  // claims table's primary key (user_id, mission_id) makes a duplicate
  // claim fail with a clean "already claimed" instead of a race condition.
  const { data, error } = await supabase.rpc("claim_mission", { p_mission_id: parsed.data.missionId }).single();

  if (error) {
    const status = error.message?.includes("already claimed")
      ? 409
      : error.message?.includes("not complete")
      ? 422
      : error.message?.includes("unknown mission")
      ? 400
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const row = data as { xp_awarded: number };
  return NextResponse.json({ xpAwarded: row.xp_awarded });
}

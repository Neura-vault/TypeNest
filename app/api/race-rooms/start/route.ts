import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RaceRoomStartSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`race-start:${user.id}`, 15, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = RaceRoomStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }

  const { data, error } = await supabase
    .rpc("start_race", { p_room_id: parsed.data.roomId })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { started_at: string };
  return NextResponse.json({ startedAt: row.started_at });
}

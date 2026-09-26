import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RaceRoomFinishSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`race-finish:${user.id}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = RaceRoomFinishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }

  const { data, error } = await supabase
    .rpc("finish_race", {
      p_room_id: parsed.data.roomId,
      p_wpm: parsed.data.wpm,
      p_accuracy: parsed.data.accuracy
    })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { place: number; all_finished: boolean };
  return NextResponse.json({ place: row.place, allFinished: row.all_finished });
}

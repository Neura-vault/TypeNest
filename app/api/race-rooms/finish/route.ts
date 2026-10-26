import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RaceRoomFinishSchema } from "@/lib/validation";
import { verifyKeystrokes } from "@/lib/raceVerify";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = await rateLimit(`race-finish:${user.id}`, 20, 60_000);
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

  // Server-side sanity checks. The client enforces word-by-word accuracy,
  // but a modified client could still post a fake result, so the time it
  // took must be physically possible for this passage.
  const { data: room } = await supabase
    .from("race_rooms")
    .select("status, started_at, word_list")
    .eq("id", parsed.data.roomId)
    .single();
  if (!room || room.status !== "racing" || !room.started_at) {
    return NextResponse.json({ error: "Race is not in progress." }, { status: 422 });
  }
  const chars = (room.word_list as string[]).reduce((sum, w) => sum + w.length + 1, 0) - 1;
  const elapsedMin = Math.max((Date.now() - new Date(room.started_at).getTime()) / 60000, 1 / 600);
  const ceilingWpm = chars / 5 / elapsedMin;

  if (parsed.data.forfeit) {
    // You can only lose a race that someone else already finished.
    const { count } = await supabase
      .from("race_participants")
      .select("user_id", { count: "exact", head: true })
      .eq("room_id", parsed.data.roomId)
      .not("finished_at", "is", null)
      .neq("user_id", user.id);
    if (!count) return NextResponse.json({ error: "Nobody has finished yet." }, { status: 422 });
  }
  let wpm = Math.round(Math.min(parsed.data.wpm, ceilingWpm));
  if (!parsed.data.forfeit) {
    if (ceilingWpm > 300) {
      return NextResponse.json({ error: "That finish time is not possible." }, { status: 422 });
    }
    // Replay the keystroke log: it must be complete, on the race clock, and
    // human-paced. The speed we record comes from the log, not the claim.
    const check = verifyKeystrokes(parsed.data.keys ?? [], chars, elapsedMin * 60000);
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 422 });
    wpm = Math.round(Math.min(wpm, check.wpm));
  }

  const { data, error } = await supabase
    .rpc("finish_race", {
      p_room_id: parsed.data.roomId,
      p_wpm: wpm,
      p_accuracy: parsed.data.accuracy
    })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { place: number; all_finished: boolean };
  return NextResponse.json({ place: row.place, allFinished: row.all_finished });
}

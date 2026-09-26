import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RaceRoomJoinSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`race-join:${user.id}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = RaceRoomJoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid code." }, { status: 422 });
  }

  const { data, error } = await supabase
    .rpc("join_race_room", { p_code: parsed.data.code })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { room_id: string; word_list: string[]; max_players: number; status: string };
  return NextResponse.json({
    roomId: row.room_id,
    wordList: row.word_list,
    maxPlayers: row.max_players,
    status: row.status
  });
}

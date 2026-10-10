import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RatingEvent {
  user_id: string;
  delta: number;
  rating_after: number;
}

interface RoomRow {
  room_id: string;
  code: string;
  status: string;
  word_list: string[];
  max_players: number;
  host_id: string;
  started_at: string | null;
  tournament_match_id: string | null;
  participant_user_id: string;
  participant_username: string;
  participant_wpm: number | null;
  participant_accuracy: number | null;
  participant_place: number | null;
  participant_finished_at: string | null;
  participant_joined_at: string;
}

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const code = params.code?.toUpperCase();

  if (!code || !/^[A-Z0-9]{4,8}$/.test(code)) {
    return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_race_room", { p_code: code });
  const rows = (data ?? []) as RoomRow[];

  // Empty result means either the room doesn't exist, or the caller isn't
  // a participant yet — the client should join first via /api/race-rooms/join.
  if (error || rows.length === 0) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const first = rows[0];

  const { data: ratingEvents } = await supabase.rpc("get_room_rating_events", { p_room_id: first.room_id });
  const typedRatingEvents: RatingEvent[] = (ratingEvents ?? []) as RatingEvent[];
  const ratingByUser = new Map<string, RatingEvent>(typedRatingEvents.map((r) => [r.user_id, r]));

  const participants = rows.map((r) => ({
    user_id: r.participant_user_id,
    username: r.participant_username,
    wpm: r.participant_wpm,
    accuracy: r.participant_accuracy,
    place: r.participant_place,
    finished_at: r.participant_finished_at,
    joined_at: r.participant_joined_at,
    eloDelta: ratingByUser.get(r.participant_user_id)?.delta ?? null,
    eloRatingAfter: ratingByUser.get(r.participant_user_id)?.rating_after ?? null
  }));

  return NextResponse.json({
    room: {
      id: first.room_id,
      code: first.code,
      status: first.status,
      wordList: first.word_list,
      maxPlayers: first.max_players,
      hostId: first.host_id,
      startedAt: first.started_at
    },
    participants,
    you: user.id
  });
}

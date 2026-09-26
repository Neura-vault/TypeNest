import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface RatingEvent {
  user_id: string;
  delta: number;
  rating_after: number;
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

  const { data: room, error: roomError } = await supabase
    .from("race_rooms")
    .select("id, code, status, word_list, max_players, host_id, started_at")
    .eq("code", code)
    .maybeSingle();

  // RLS means this also (correctly) returns null for a room the caller
  // hasn't joined yet — the client should join first via /api/race-rooms/join.
  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const { data: participants } = await supabase
    .from("race_participants")
    .select("user_id, username, wpm, accuracy, place, finished_at, joined_at")
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true });

  const { data: ratingEvents } = await supabase.rpc("get_room_rating_events", { p_room_id: room.id });

  const typedRatingEvents: RatingEvent[] = (ratingEvents ?? []) as RatingEvent[];

  const ratingByUser = new Map<string, RatingEvent>(typedRatingEvents.map((r) => [r.user_id, r]));

  const enrichedParticipants = (participants ?? []).map((p) => ({
    ...p,
    eloDelta: ratingByUser.get(p.user_id)?.delta ?? null,
    eloRatingAfter: ratingByUser.get(p.user_id)?.rating_after ?? null
  }));

  return NextResponse.json({
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      wordList: room.word_list,
      maxPlayers: room.max_players,
      hostId: room.host_id,
      startedAt: room.started_at
    },
    participants: enrichedParticipants,
    you: user.id
  });
}

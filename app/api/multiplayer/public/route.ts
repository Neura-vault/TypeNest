import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, code, max_participants, created_at")
    .eq("is_public", true)
    .eq("status", "registration")
    .order("created_at", { ascending: false })
    .limit(20);

  const ids = (tournaments ?? []).map((t) => t.id);
  let countByTournament = new Map<string, number>();

  if (ids.length > 0) {
    const { data: counts } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .in("tournament_id", ids);

    countByTournament = (counts ?? []).reduce((map, row) => {
      map.set(row.tournament_id, (map.get(row.tournament_id) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  }

  const enriched = (tournaments ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    maxParticipants: t.max_participants,
    participantCount: countByTournament.get(t.id) ?? 0
  }));

  return NextResponse.json({ tournaments: enriched });
}

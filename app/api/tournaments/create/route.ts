import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TournamentCreateSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`tournament-create:${user.id}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = TournamentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }

  const { data, error } = await supabase
    .rpc("create_tournament", { p_name: parsed.data.name, p_max_participants: parsed.data.maxParticipants })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { tournament_id: string; code: string };
  return NextResponse.json({ tournamentId: row.tournament_id, code: row.code });
}

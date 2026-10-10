import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

const Schema = z.object({ roomId: z.string().uuid() });

// Closes out a race whose remaining players have disconnected.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = await rateLimit(`race-settle:${user.id}`, 30, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { data, error } = await supabase.rpc("settle_stale_race", { p_room_id: parsed.data.roomId });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ settled: Number(data) || 0 });
}

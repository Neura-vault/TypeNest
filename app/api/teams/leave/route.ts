import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`team-leave:${user.id}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  const { error } = await supabase.rpc("leave_team");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}

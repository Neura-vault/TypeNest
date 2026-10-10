import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

async function currentUser() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const unauthorized = () => NextResponse.json({ error: "Sign in required." }, { status: 401 });

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  const { data, error } = await supabase.rpc("list_friends");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ friends: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  const limited = await rateLimit(`friend-add:${user.id}`, 20, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = z.object({ username: z.string().min(1).max(30) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a username." }, { status: 400 });
  const { data, error } = await supabase.rpc("send_friend_request", { p_username: parsed.data.username });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ result: data });
}

const IdSchema = z.object({ id: z.string().uuid() });

export async function PATCH(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  const parsed = IdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user) return unauthorized();
  const parsed = IdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { error } = await supabase.from("friendships").delete().eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ ok: true });
}

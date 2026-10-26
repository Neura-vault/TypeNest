import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/apiKey";
import { rateLimit } from "@/lib/rateLimit";

const MAX_ACTIVE = 5;

async function session() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}
const unauthorized = () => NextResponse.json({ error: "Sign in required." }, { status: 401 });

export async function GET() {
  const { supabase, user } = await session();
  if (!user) return unauthorized();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load keys." }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await session();
  if (!user) return unauthorized();
  const limited = await rateLimit(`key-create:${user.id}`, 10, 60 * 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = z.object({ name: z.string().trim().min(1).max(40) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give the key a name (up to 40 characters)." }, { status: 400 });

  const { count } = await supabase.from("api_keys").select("id", { count: "exact", head: true }).is("revoked_at", null);
  if ((count ?? 0) >= MAX_ACTIVE) {
    return NextResponse.json({ error: `You can have up to ${MAX_ACTIVE} active keys. Revoke one first.` }, { status: 422 });
  }

  const { key, prefix, hash } = generateApiKey();
  const { error } = await supabase.from("api_keys").insert({ user_id: user.id, name: parsed.data.name, prefix, key_hash: hash });
  if (error) return NextResponse.json({ error: "Could not create the key." }, { status: 500 });
  // The only time the full key is ever returned.
  return NextResponse.json({ key });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await session();
  if (!user) return unauthorized();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Could not revoke the key." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

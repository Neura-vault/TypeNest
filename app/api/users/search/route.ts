import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, requestIp } from "@/lib/rateLimit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  // Anonymous-accessible route — the query itself is what lets someone try
  // to enumerate the user list, so this is limited per-IP rather than
  // per-account.
  const limited = rateLimit(`search:${requestIp(request)}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("search_profiles", { p_query: q, p_limit: 8 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

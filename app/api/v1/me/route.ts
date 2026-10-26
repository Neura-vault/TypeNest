import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/apiAuth";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/v1/me : the profile that owns the API key.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("username, level, xp, avatar_url, country, bio, elo_rating")
    .eq("id", auth.userId)
    .single();
  if (error) return NextResponse.json({ error: "Could not load the profile." }, { status: 500 });
  return NextResponse.json({ data });
}

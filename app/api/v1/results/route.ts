import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/apiAuth";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/v1/results?limit=25 : your most recent typing tests, newest first (max 100).
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const raw = Number(new URL(request.url).searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(raw) ? Math.min(100, Math.max(1, Math.floor(raw))) : 25;
  const { data, error } = await createAdminClient()
    .from("typing_tests")
    .select("wpm, raw_wpm, accuracy, consistency, test_type, duration_sec, word_count, characters_typed, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: "Could not load results." }, { status: 500 });
  return NextResponse.json({ data });
}

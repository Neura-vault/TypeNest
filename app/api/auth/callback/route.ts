import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect Supabase sends users to after clicking a confirmation
// email link or completing an OAuth flow, and exchanges the code for a
// real session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

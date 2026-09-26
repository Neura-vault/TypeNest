import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Used by AppShell (client-side) instead of RootLayout doing this same
// auth.getUser() + profiles lookup on the server for every single page
// request. That pattern forced the entire app into dynamic rendering —
// no static generation, no caching, even for pages like the homepage that
// don't need any user-specific data at all. Fetching it once client-side
// after hydration keeps pages statically renderable and this one small
// request is the only thing that pays the DB round-trip cost.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isLoggedIn: false, profile: null });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, level, xp")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ isLoggedIn: true, profile: profile ?? null });
}

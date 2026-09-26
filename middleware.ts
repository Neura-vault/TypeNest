// Refreshes the Supabase auth session cookie on every request so a logged-in
// user's session doesn't silently expire while they're active on the site.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars aren't set yet (e.g. first local run before .env.local
  // exists), skip session refresh instead of crashing every page load.
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on every page route, but not on /api/** — every API route
    // handler already builds its own Supabase client per-request (see
    // lib/supabase/server.ts) and that client can set cookies fine inside
    // a Route Handler, so it refreshes the session itself. Also excluded:
    // static assets and image optimization files.
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"
  ]
};

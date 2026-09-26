import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUsername, isValidCountry, sanitizeSocialLinks } from "@/lib/profile";
import { rateLimit } from "@/lib/rateLimit";

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`profile:${user.id}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.username === "string") {
    if (!isValidUsername(body.username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters: letters, numbers, underscore or hyphen only, and not a reserved name." },
        { status: 422 }
      );
    }
    updates.username = body.username;
  }

  if (typeof body.bio === "string") {
    if (body.bio.length > 200) {
      return NextResponse.json({ error: "Bio must be 200 characters or fewer." }, { status: 422 });
    }
    updates.bio = body.bio;
  }

  if (typeof body.country === "string") {
    if (body.country.length > 0 && !isValidCountry(body.country)) {
      return NextResponse.json({ error: "Unrecognized country." }, { status: 422 });
    }
    updates.country = body.country;
  }

  if (body.socialLinks !== undefined) {
    updates.social_links = sanitizeSocialLinks(body.socialLinks);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();

  if (error) {
    // Postgres unique_violation on the username constraint
    if (error.code === "23505") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    if (error.code === "23514") {
      return NextResponse.json({ error: "Username format is invalid." }, { status: 422 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

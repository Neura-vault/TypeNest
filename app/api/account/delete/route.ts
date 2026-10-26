import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

// Permanently deletes the signed-in user's account and the data tied to it.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = await rateLimit(`account-delete:${user.id}`, 3, 60 * 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const parsed = z.object({ confirm: z.literal("DELETE") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });

  const admin = createAdminClient();

  // Profile photos live in storage, outside the database cascade.
  const { data: files } = await admin.storage.from("avatars").list(user.id, { limit: 100 });
  if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));

  // Deleting the auth user cascades to the profile and the data linked to it.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Could not delete the account. Nothing was removed from your sign-in." }, { status: 500 });

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

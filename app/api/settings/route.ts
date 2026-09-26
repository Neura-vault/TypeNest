import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SettingsSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

const DEFAULTS = {
  theme: "aurora" as const,
  fontSize: 16,
  soundEnabled: true,
  animationsEnabled: true,
  reducedMotion: false,
  focusMode: false
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    // Guests get sane defaults — the settings page and AppShell both work
    // without an account, they just don't persist anywhere but this
    // browser's localStorage until the person signs up.
    return NextResponse.json({ settings: DEFAULTS });
  }

  const { data } = await supabase
    .from("user_settings")
    .select("theme, font_size, sound_enabled, animations_enabled, reduced_motion, focus_mode")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    return NextResponse.json({ settings: DEFAULTS });
  }

  return NextResponse.json({
    settings: {
      theme: data.theme,
      fontSize: data.font_size,
      soundEnabled: data.sound_enabled,
      animationsEnabled: data.animations_enabled,
      reducedMotion: data.reduced_motion,
      focusMode: data.focus_mode
    }
  });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`settings:${user.id}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }
  const d = parsed.data;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (d.theme !== undefined) updates.theme = d.theme;
  if (d.fontSize !== undefined) updates.font_size = d.fontSize;
  if (d.soundEnabled !== undefined) updates.sound_enabled = d.soundEnabled;
  if (d.animationsEnabled !== undefined) updates.animations_enabled = d.animationsEnabled;
  if (d.reducedMotion !== undefined) updates.reduced_motion = d.reducedMotion;
  if (d.focusMode !== undefined) updates.focus_mode = d.focusMode;

  // No XP/reward implications here, just preferences — a plain RLS-guarded
  // update (owner-only, see settings_owner_only policy) is appropriate;
  // this doesn't need the atomic security-definer treatment the
  // XP-awarding tables needed.
  const { error } = await supabase.from("user_settings").upsert({ user_id: user.id, ...updates });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

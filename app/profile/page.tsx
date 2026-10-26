import { createClient } from "@/lib/supabase/server";
import { levelFromXp } from "@/lib/gamification";
import { sanitizeSocialLinks } from "@/lib/profile";
import { getRankTier } from "@/lib/elo";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileDashboard from "@/components/ProfileDashboard";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold mb-2">Sign in to see your profile</h2>
        <p style={{ color: "var(--text-dim)" }}>Your profile, XP and achievements are tied to your account.</p>
      </div>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: tests } = await supabase
    .from("typing_tests")
    .select("wpm, accuracy, consistency, characters_typed, created_at")
    .eq("user_id", user.id);
  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("achievement_id, achievements(title, desc:description, emoji)")
    .eq("user_id", user.id);

  const level = levelFromXp(profile?.xp ?? 0);
  const rankTier = getRankTier(profile?.elo_rating ?? 1000);
  return (
    <div className="pd">
      <ProfileHeader
        username={profile?.username ?? "Unknown"}
        uid={profile?.uid ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        level={level}
        xp={profile?.xp ?? 0}
        bio={profile?.bio ?? null}
        country={profile?.country ?? null}
        socialLinks={sanitizeSocialLinks(profile?.social_links)}
        isOwner
        eloRating={profile?.elo_rating ?? 1000}
        rankTierName={rankTier.name}
        rankTierColor={rankTier.color}
      />

      <ProfileDashboard
        tests={(tests ?? []).map((t) => ({
          wpm: Number(t.wpm),
          accuracy: Number(t.accuracy),
          consistency: t.consistency == null ? null : Number(t.consistency),
          chars: Number(t.characters_typed),
          at: t.created_at as string
        }))}
        achievements={(achievements ?? []).map((a) => {
          const ach = a.achievements as unknown as { title: string; desc: string; emoji: string };
          return { id: a.achievement_id as string, title: ach?.title ?? "", desc: ach?.desc ?? "", emoji: ach?.emoji ?? "" };
        })}
      />
    </div>
  );
}


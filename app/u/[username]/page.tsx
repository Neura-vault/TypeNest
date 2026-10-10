import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSocialLinks } from "@/lib/profile";
import { getRankTier } from "@/lib/elo";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileDashboard from "@/components/ProfileDashboard";

export function generateMetadata({ params }: { params: { username: string } }) {
  return {
    title: `${params.username} on TypeNest`,
    description: `${params.username}'s typing profile: speed, accuracy and achievements on TypeNest.`
  };
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();

  const { data: rows } = await supabase.rpc("get_public_profile", { p_username: params.username });
  const profile = rows?.[0];

  if (!profile) notFound();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;
  const rankTier = getRankTier(profile.elo_rating ?? 1000);

  const { data: statsRows } = await supabase.rpc("get_public_profile_stats", { p_username: params.username });
  const stats = statsRows?.[0] ?? { tests_taken: 0, best_wpm: 0, avg_accuracy: 0 };

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("achievement_id, achievements(title, desc:description, emoji)")
    .eq("user_id", profile.id);

  const { data: perf } = await supabase.rpc("get_public_performance", { p_username: params.username });

  return (
    <div className="pd">
      <ProfileHeader
        username={profile.username}
        uid={profile.uid}
        avatarUrl={profile.avatar_url}
        level={profile.level}
        xp={profile.xp}
        bio={profile.bio}
        country={profile.country}
        socialLinks={sanitizeSocialLinks(profile.social_links)}
        isOwner={isOwner}
        eloRating={profile.elo_rating ?? 1000}
        rankTierName={rankTier.name}
        rankTierColor={rankTier.color}
      />

      <ProfileDashboard
        publicView
        tests={((perf ?? []) as { wpm: number; accuracy: number; consistency: number | null; characters_typed: number; created_at: string }[]).map((t) => ({
          wpm: Number(t.wpm),
          accuracy: Number(t.accuracy),
          consistency: t.consistency == null ? null : Number(t.consistency),
          chars: Number(t.characters_typed),
          at: t.created_at
        }))}
        achievements={(achievements ?? []).map((a) => {
          const ach = a.achievements as unknown as { title: string; desc: string; emoji: string };
          return { id: a.achievement_id as string, title: ach?.title ?? "", desc: ach?.desc ?? "", emoji: ach?.emoji ?? "" };
        })}
      />
    </div>
  );
}


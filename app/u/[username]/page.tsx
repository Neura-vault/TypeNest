import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSocialLinks } from "@/lib/profile";
import { getRankTier } from "@/lib/elo";
import ProfileHeader from "@/components/ProfileHeader";

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

  return (
    <div className="py-8">
      <ProfileHeader
        username={profile.username}
        uid={profile.uid}
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

      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <Tile value={stats.tests_taken} label="Tests taken" />
        <Tile value={stats.best_wpm} label="Best WPM" color="var(--blue-500)" />
        <Tile value={`${stats.avg_accuracy}%`} label="Avg accuracy" />
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Achievements ({achievements?.length ?? 0})</h3>
        {achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {achievements.map((a) => {
              const ach = a.achievements as unknown as { title: string; desc: string; emoji: string };
              return (
                <div key={a.achievement_id} className="card p-4 text-center">
                  <div className="text-2xl mb-2">{ach?.emoji}</div>
                  <h5 className="text-xs font-bold">{ach?.title}</h5>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>{ach?.desc}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "var(--text-dim)" }}>No achievements unlocked yet.</p>
        )}
      </div>
    </div>
  );
}

function Tile({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="card p-5">
      <div className="font-heading text-2xl font-bold" style={{ color: color ?? "var(--text)" }}>{value}</div>
      <div className="text-xs font-semibold mt-1" style={{ color: "var(--text-dim)" }}>{label}</div>
    </div>
  );
}

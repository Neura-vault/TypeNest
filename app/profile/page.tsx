import { createClient } from "@/lib/supabase/server";
import { levelFromXp } from "@/lib/gamification";
import { sanitizeSocialLinks } from "@/lib/profile";
import { getRankTier } from "@/lib/elo";
import RadarChart from "@/components/RadarChart";
import ProfileHeader from "@/components/ProfileHeader";
import StreakCalendar from "@/components/StreakCalendar";

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
  const { data: tests } = await supabase.from("typing_tests").select("*").eq("user_id", user.id);
  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("achievement_id, achievements(title, desc:description, emoji)")
    .eq("user_id", user.id);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 200);
  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("session_date, tests_count")
    .eq("user_id", user.id)
    .gte("session_date", sixMonthsAgo.toISOString().slice(0, 10));

  const level = levelFromXp(profile?.xp ?? 0);
  const rankTier = getRankTier(profile?.elo_rating ?? 1000);
  const testCount = tests?.length ?? 0;
  const avgAcc = testCount ? Math.round((tests ?? []).reduce((a, t) => a + Number(t.accuracy), 0) / testCount) : 0;
  const avgCons = testCount
    ? Math.round((tests ?? []).reduce((a, t) => a + Number(t.consistency ?? 0), 0) / testCount)
    : 0;
  const avgWpm = testCount ? Math.round((tests ?? []).reduce((a, t) => a + Number(t.wpm), 0) / testCount) : 0;
  const bestWpm = testCount ? Math.max(...(tests ?? []).map((t) => Number(t.wpm))) : 0;
  const wordsTyped = (tests ?? []).reduce((a, t) => a + Math.round(Number(t.characters_typed) / 5), 0);

  const dnaItems = [
    { label: "Speed", value: Math.min(100, Math.round((avgWpm / 80) * 100)) },
    { label: "Accuracy", value: avgAcc },
    { label: "Consistency", value: avgCons },
    { label: "Endurance", value: 50 },
    { label: "Activity", value: Math.min(100, Math.round(wordsTyped / 5)) }
  ];

  return (
    <div className="py-8">
      <ProfileHeader
        username={profile?.username ?? "Unknown"}
        uid={profile?.uid ?? null}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <Tile value={testCount} label="Total tests" />
        <Tile value={bestWpm} label="Best WPM" color="var(--blue-500)" />
        <Tile value={`${avgAcc}%`} label="Avg accuracy" />
        <Tile value={wordsTyped} label="Words typed" color="var(--amber-500)" />
      </div>

      {testCount > 0 ? (
        <div className="card p-6 mb-5">
          <h3 className="font-semibold mb-1">Typing DNA</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
            Built from your real saved tests.
          </p>
          <RadarChart items={dnaItems} />
        </div>
      ) : (
        <div className="card p-8 text-center mb-5" style={{ color: "var(--text-dim)" }}>
          Complete a few tests and your Typing DNA chart will render here.
        </div>
      )}

      <div className="card p-6 mb-5">
        <StreakCalendar
          sessions={(sessions ?? []).map((s) => ({ date: s.session_date as string, count: Number(s.tests_count) }))}
        />
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
          <p style={{ color: "var(--text-dim)" }}>No achievements unlocked yet — take a test to earn your first one.</p>
        )}
      </div>
    </div>
  );
}

function Tile({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="card hover-lift p-5">
      <div className="font-heading text-2xl font-bold" style={{ color: color ?? "var(--text)" }}>{value}</div>
      <div className="text-xs font-semibold mt-1" style={{ color: "var(--text-dim)" }}>{label}</div>
    </div>
  );
}

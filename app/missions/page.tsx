import { createClient } from "@/lib/supabase/server";
import { MISSIONS, levelFromXp } from "@/lib/gamification";
import MissionRow from "@/components/MissionRow";

export default async function MissionsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold mb-2">Sign in to see your missions</h2>
        <p style={{ color: "var(--text-dim)" }}>Missions, XP and claims are tied to your account.</p>
      </div>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("xp").eq("id", user.id).single();
  const { data: claims } = await supabase.from("user_mission_claims").select("mission_id").eq("user_id", user.id);
  const claimedIds = new Set((claims ?? []).map((c) => c.mission_id));

  const { count: testsCount } = await supabase
    .from("typing_tests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const { data: tests } = await supabase.from("typing_tests").select("wpm, accuracy, characters_typed, content_type").eq("user_id", user.id);
  const { count: lessonsCount } = await supabase
    .from("user_lesson_progress")
    .select("lesson_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("passed", true);
  const { count: gamesCount } = await supabase
    .from("game_scores")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const { count: raceWinsCount } = await supabase
    .from("ai_race_results")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("won", true);
  const { count: challengeCount } = await supabase
    .from("daily_challenge_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const wordsTyped = (tests ?? []).reduce((a, t) => a + Math.round(Number(t.characters_typed) / 5), 0);
  const bestAcc = (tests ?? []).reduce((a, t) => Math.max(a, Number(t.accuracy)), 0);
  const bestWpm = (tests ?? []).reduce((a, t) => Math.max(a, Number(t.wpm)), 0);
  const triedCode = (tests ?? []).some((t) => t.content_type === "code");

  const progressMap: Record<string, number> = {
    m1: testsCount ?? 0,
    m2: wordsTyped,
    m3: bestAcc >= 90 ? 1 : 0,
    m4: lessonsCount ?? 0,
    m5: gamesCount ?? 0,
    m6: raceWinsCount ?? 0,
    m7: bestWpm >= 60 ? 1 : 0,
    m8: challengeCount ?? 0,
    m9: triedCode ? 1 : 0
  };

  const xp = profile?.xp ?? 0;
  const level = levelFromXp(xp);
  const intoLevel = xp - (level - 1) * 150;

  return (
    <div className="py-8">
      <div className="rounded-2xl p-6 mb-5 text-white" style={{ background: "var(--amber-grad)" }}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold">Level {level}</h2>
          <span className="text-sm font-semibold opacity-90">{xp} XP total</span>
        </div>
        <div className="h-3 rounded-full bg-white/30 overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${(intoLevel / 150) * 100}%` }} />
        </div>
        <div className="flex justify-between text-xs font-semibold opacity-90 mt-2">
          <span>{intoLevel} / 150 XP</span>
          <span>{150 - intoLevel} XP to Level {level + 1}</span>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-1">Missions</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
          Real progress from your saved history.
        </p>
        {MISSIONS.map((m) => (
          <MissionRow
            key={m.id}
            mission={m}
            progress={Math.min(m.target, progressMap[m.id] ?? 0)}
            claimed={claimedIds.has(m.id)}
          />
        ))}
      </div>
    </div>
  );
}

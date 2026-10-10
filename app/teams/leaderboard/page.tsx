import { createClient } from "@/lib/supabase/server";

interface TeamLeaderboardRow {
  team_id: string;
  name: string;
  emoji: string;
  member_count: number;
  avg_wpm: number;
}

export default async function TeamLeaderboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold mb-2">Sign in to see the team leaderboard</h2>
      </div>
    );
  }

  const { data } = await supabase.rpc("get_team_leaderboard", { limit_count: 50 });
  const teams = (data ?? []) as TeamLeaderboardRow[];

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1">Team Leaderboard</h1>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Ranked by average of each member&apos;s best WPM.
          </p>
        </div>
        <a href="/teams" className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold">
          ← My Team
        </a>
      </div>

      {teams.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--text-dim)" }}>
          No teams with recorded tests yet — be the first!
        </div>
      ) : (
        <div className="card p-2">
          {teams.map((t, i) => (
            <div
              key={t.team_id}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: i % 2 === 0 ? "transparent" : "var(--surface-2)" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold w-6 text-center" style={{ color: "var(--text-dim)" }}>
                  {i + 1}
                </span>
                <span className="text-lg">{t.emoji}</span>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {t.member_count} member{Number(t.member_count) > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <span className="font-bold" style={{ color: "var(--blue-500)" }}>
                {t.avg_wpm} WPM
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

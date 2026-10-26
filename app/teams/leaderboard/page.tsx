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
    <div className="lb">
      <header className="cp-head tm-head">
        <div>
          <h1>Team leaderboard</h1>
          <p>Ranked by the average of each member&apos;s best WPM.</p>
        </div>
        <a href="/teams" className="btn-ghost tn-btn">← My team</a>
      </header>
      <section className="lb-table">
        {teams.length === 0 ? (
          <p className="pd-empty">No teams with recorded tests yet. Be the first.</p>
        ) : (
          <ol>
            <li className="lb-row lb-th">
              <span>#</span><span>Team</span><span>Avg WPM</span><span className="lb-hide">Members</span>
            </li>
            {teams.map((t, i) => (
              <li key={t.team_id} className="lb-row" data-top={i < 3 ? i + 1 : undefined}>
                <span className="lb-rank">{String(i + 1).padStart(2, "0")}</span>
                <span className="lb-player"><span className="lb-mono">{t.emoji}</span><span><b>{t.name}</b></span></span>
                <span className="lb-wpm">{t.avg_wpm}</span>
                <span className="lb-hide lb-tests">{t.member_count}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

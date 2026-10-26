import { createClient } from "@/lib/supabase/server";
import { getRankTier, RANK_TIERS } from "@/lib/elo";

interface RankedRow {
  username: string;
  avatar_url: string | null;
  elo_rating: number;
}

export default async function RankedLeaderboardPage() {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_ranked_leaderboard", { limit_count: 50 });
  const rows = (data ?? []) as RankedRow[];

  return (
    <div className="lb">
      <header className="cp-head tm-head">
        <div>
          <h1>Ranked leaderboard</h1>
          <p>Your rating changes after every multiplayer race. Beat tougher opponents for a bigger gain.</p>
        </div>
        <a href="/multiplayer" className="btn-primary tn-btn">Race now</a>
      </header>

      <div className="lb-grid">
        <aside className="lb-filters">
          <p className="pf-label">Rating tiers</p>
          <ul className="rk-tiers">
            {RANK_TIERS.map((t) => (
              <li key={t.name}>
                <i style={{ background: t.color }} />
                <span>{t.name}</span>
                <small>{t.min}+</small>
              </li>
            ))}
          </ul>
        </aside>

        <section className="lb-table">
          {rows.length === 0 ? (
            <p className="pd-empty">No rated races yet. Finish a multiplayer race to get on the board.</p>
          ) : (
            <ol>
              <li className="lb-row lb-th">
                <span>#</span><span>Player</span><span>Rating</span><span className="lb-hide">Tier</span>
              </li>
              {rows.map((r, i) => {
                const tier = getRankTier(r.elo_rating);
                return (
                  <li key={r.username} className="lb-row" data-top={i < 3 ? i + 1 : undefined}>
                    <span className="lb-rank">{String(i + 1).padStart(2, "0")}</span>
                    <a href={`/u/${r.username}`} className="lb-player">
                      <span className="lb-mono">{r.username[0]?.toUpperCase()}</span>
                      <span><b>{r.username}</b></span>
                    </a>
                    <span className="lb-wpm">{r.elo_rating}</span>
                    <span className="lb-hide rk-tier"><i style={{ background: tier.color }} />{tier.name}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getRankTier } from "@/lib/elo";

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
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1">Ranked Leaderboard</h1>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Rating changes after every multiplayer race — win against tougher opponents for a bigger gain.
          </p>
        </div>
        <a href="/compete/multiplayer" className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold">
          Race Now →
        </a>
      </div>

      <div className="card p-2">
        {rows.map((r, i) => {
          const tier = getRankTier(r.elo_rating);
          return (
            <div
              key={r.username}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: i % 2 === 0 ? "transparent" : "var(--surface-2)" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold w-6 text-center" style={{ color: "var(--text-dim)" }}>
                  {i + 1}
                </span>
                <a href={`/u/${r.username}`} className="font-semibold text-sm hover:underline">
                  {r.username}
                </a>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)" }}>
                  <span style={{ color: tier.color }}>●</span> {tier.name}
                </span>
              </div>
              <span className="font-bold" style={{ color: "var(--blue-500)" }}>
                {r.elo_rating}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

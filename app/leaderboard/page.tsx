import { createPublicClient } from "@/lib/supabase/public";
import Link from "next/link";

const PERIODS = [
  { id: "all", label: "All-Time" },
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly" },
  { id: "daily", label: "Daily" }
];

const CATEGORIES = [
  { id: "", label: "Any Mode" },
  { id: "time_15", label: "15s" },
  { id: "time_30", label: "30s" },
  { id: "time_60", label: "60s" },
  { id: "words_25", label: "25 words" },
  { id: "words_50", label: "50 words" },
  { id: "words_100", label: "100 words" }
];

function buildHref(period: string, category: string) {
  const params = new URLSearchParams();
  if (period !== "all") params.set("period", period);
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}` : "/leaderboard";
}

export default async function LeaderboardPage({
  searchParams
}: {
  searchParams: { period?: string; category?: string };
}) {
  const period = PERIODS.some((p) => p.id === searchParams.period) ? searchParams.period! : "all";
  const category = CATEGORIES.some((c) => c.id === searchParams.category) ? searchParams.category! : "";

  const supabase = createPublicClient();
  const { data: rows, error } = await supabase.rpc("get_leaderboard_wpm", {
    limit_count: 50,
    p_period: period,
    p_category: category || null
  });

  return (
    <div className="py-8">
      <div className="card p-6 mb-6 relative overflow-hidden" style={{ background: "var(--hero-grad)" }}>
        <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full opacity-25 -z-10" style={{ background: "#fff", filter: "blur(46px)" }} />
        <h1 className="relative text-2xl font-bold text-white mb-1">🏆 Global Leaderboard</h1>
        <p className="relative text-white/85 text-sm">
          Ranked by best WPM. Verified accounts only — a fresh disposable signup can&apos;t just script its way to #1.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={buildHref(p.id, category)}
            className="px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors"
            style={
              period === p.id
                ? { background: "var(--brand-grad)", color: "#fff" }
                : { background: "var(--surface-2)", color: "var(--text-dim)", border: "1px solid var(--border)" }
            }
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id || "any"}
            href={buildHref(period, c.id)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            style={
              category === c.id
                ? { background: "var(--amber-grad)", color: "#fff" }
                : { background: "var(--surface-2)", color: "var(--text-dim)", border: "1px solid var(--border)" }
            }
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        {error && (
          <p className="p-6 text-sm" style={{ color: "var(--text-dim)" }}>
            Couldn&apos;t load the leaderboard right now: {error.message}
          </p>
        )}
        {!error && (!rows || rows.length === 0) && (
          <p className="p-8 text-center" style={{ color: "var(--text-dim)" }}>
            No tests match this filter yet — be the first to appear here.
          </p>
        )}
        {rows && rows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--text-dim)" }}>
                <th className="p-4 font-semibold text-xs uppercase">#</th>
                <th className="p-4 font-semibold text-xs uppercase">Player</th>
                <th className="p-4 font-semibold text-xs uppercase">Best WPM</th>
                <th className="p-4 font-semibold text-xs uppercase">Tests</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: { username: string; uid?: string; best_wpm: number; tests_taken: number }, i: number) => (
                <tr key={r.username} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-4 font-heading font-bold" style={{ fontSize: i < 3 ? 19 : 15 }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="p-4">
                    <Link href={`/u/${r.username}`} className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: "var(--brand-grad)" }}
                      >
                        {r.username[0]?.toUpperCase()}
                      </span>
                      <span>
                        <span className="font-semibold block">{r.username}</span>
                        {r.uid && (
                          <span className="text-[11px] font-mono block" style={{ color: "var(--text-dim)" }}>{r.uid}</span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="p-4 font-bold" style={{ color: "var(--blue-500)" }}>{r.best_wpm}</td>
                  <td className="p-4" style={{ color: "var(--text-dim)" }}>{r.tests_taken}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

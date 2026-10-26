import { createPublicClient } from "@/lib/supabase/public";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

function buildHref(period: string, category: string, scope = "") {
  const params = new URLSearchParams();
  if (period !== "all") params.set("period", period);
  if (category) params.set("category", category);
  if (scope) params.set("scope", scope);
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}` : "/leaderboard";
}

export default async function LeaderboardPage({
  searchParams
}: {
  searchParams: { period?: string; category?: string; scope?: string };
}) {
  const period = PERIODS.some((p) => p.id === searchParams.period) ? searchParams.period! : "all";
  const category = CATEGORIES.some((c) => c.id === searchParams.category) ? searchParams.category! : "";

  const scope = searchParams.scope === "friends" ? "friends" : "";
  const supabase = createPublicClient();
  const { data: allRows, error } = await supabase.rpc("get_leaderboard_wpm", {
    limit_count: scope ? 500 : 50,
    p_period: period,
    p_category: category || null
  });

  // "Friends only": keep the signed-in player and their accepted friends.
  let rows = allRows as { username: string; uid?: string; best_wpm: number; tests_taken: number }[] | null;
  let emptyText = "No tests match this filter yet. Be the first to appear here.";
  if (scope) {
    const auth = createClient();
    const {
      data: { user }
    } = await auth.auth.getUser();
    if (!user) {
      rows = [];
      emptyText = "Sign in to see how you rank against your friends.";
    } else {
      const [{ data: friends }, { data: me }] = await Promise.all([
        auth.rpc("list_friends"),
        auth.from("profiles").select("username").eq("id", user.id).single()
      ]);
      const names = new Set<string>(
        ((friends ?? []) as { username: string; relation: string }[]).filter((f) => f.relation === "friend").map((f) => f.username)
      );
      if (me?.username) names.add(me.username);
      rows = (rows ?? []).filter((r) => names.has(r.username)).slice(0, 50);
      emptyText = "No tests from you or your friends match this filter yet. Add friends from the Friends page.";
    }
  }

  const filterLink = (active: boolean, href: string, label: string) => (
    <Link key={href} href={href} data-on={active} className="lb-f">
      {label}
    </Link>
  );

  return (
    <div className="lb">
      <header className="lb-head">
        <h1>Global leaderboard</h1>
        <p>Ranked by best WPM. Verified accounts only, so a fresh disposable signup cannot script its way to the top.</p>
      </header>

      <div className="lb-grid">
        <aside className="lb-filters">
          <p className="pf-label">Show</p>
          <div className="lb-fl">
            {filterLink(scope === "", buildHref(period, category, ""), "Everyone")}
            {filterLink(scope === "friends", buildHref(period, category, "friends"), "Friends only")}
          </div>
          <p className="pf-label">Period</p>
          <div className="lb-fl">{PERIODS.map((p) => filterLink(period === p.id, buildHref(p.id, category, scope), p.label))}</div>
          <p className="pf-label">Test type</p>
          <div className="lb-fl">{CATEGORIES.map((c) => filterLink(category === c.id, buildHref(period, c.id, scope), c.label))}</div>
        </aside>

        <section className="lb-table">
          {error && <p className="pd-empty">Could not load the leaderboard right now: {error.message}</p>}
          {!error && (!rows || rows.length === 0) && (
            <p className="pd-empty">{emptyText}</p>
          )}
          {rows && rows.length > 0 && (
            <ol>
              <li className="lb-row lb-th">
                <span>#</span><span>Player</span><span>Best WPM</span><span className="lb-hide">Tests</span>
              </li>
              {rows.map((r, i) => (
                <li key={r.username} className="lb-row" data-top={i < 3 ? i + 1 : undefined}>
                  <span className="lb-rank">{i + 1}</span>
                  <Link href={`/u/${r.username}`} className="lb-player">
                    <span className="lb-mono">{r.username[0]?.toUpperCase()}</span>
                    <span>
                      <b>{r.username}</b>
                      {r.uid && <small>{r.uid}</small>}
                    </span>
                  </Link>
                  <span className="lb-wpm">{r.best_wpm}</span>
                  <span className="lb-hide lb-tests">{r.tests_taken}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function StatsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EmptyState
        title="Sign in to see your stats"
        desc="Your typing history is tied to your account so it can follow you across devices."
      />
    );
  }

  const { data: tests } = await supabase
    .from("typing_tests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!tests || tests.length === 0) {
    return (
      <EmptyState title="No tests yet" desc="Complete a typing test and your real stats will show up here." />
    );
  }

  const avgWpm = Math.round(tests.reduce((a, t) => a + Number(t.wpm), 0) / tests.length);
  const bestWpm = Math.max(...tests.map((t) => Number(t.wpm)));
  const avgAcc = Math.round(tests.reduce((a, t) => a + Number(t.accuracy), 0) / tests.length);

  const chron = [...tests].reverse();
  const values = chron.map((t) => Number(t.wpm));
  const bestTest = tests.reduce((m, t) => (Number(t.wpm) > Number(m.wpm) ? t : m), tests[0]);
  const latest = tests[0];
  const avgOf = (arr: typeof tests) => arr.reduce((x, t) => x + Number(t.wpm), 0) / arr.length;
  const trend = tests.length >= 10 ? Math.round(avgOf(tests.slice(0, 5)) - avgOf(tests.slice(5, 10))) : null;
  const when = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div>
      <header className="cp-head">
        <h1>Your stats</h1>
        <p>Based on your last {tests.length} saved {tests.length === 1 ? "test" : "tests"}.</p>
      </header>

      <div className="st-strip">
        <div><b>{tests.length}</b><small>Tests</small></div>
        <div><b>{avgWpm}</b><small>Average WPM</small></div>
        <div><b>{bestWpm}</b><small>Best WPM</small></div>
        <div><b>{avgAcc}%</b><small>Average accuracy</small></div>
      </div>

      <div className="st-main">
        <section>
          <p className="pf-label">Speed over time</p>
          {values.length > 1 ? <Trend values={values} /> : <p className="pd-lab" style={{ marginTop: 12 }}>Take one more test to see your trend.</p>}
        </section>
        <section className="st-notes">
          <p className="pf-label">Highlights</p>
          <dl>
            <div><dt>Best test</dt><dd>{bestTest.wpm} WPM at {bestTest.accuracy}% <small>{when(bestTest.created_at)}</small></dd></div>
            <div><dt>Latest test</dt><dd>{latest.wpm} WPM at {latest.accuracy}% <small>{when(latest.created_at)}</small></dd></div>
            <div>
              <dt>Last 5 vs the 5 before</dt>
              <dd>{trend === null ? "Needs 10 tests" : trend === 0 ? "No change" : `${trend > 0 ? "+" : ""}${trend} WPM`}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="st-history">
        <p className="pf-label">Test history</p>
        <div className="st-scroll">
          <table>
            <thead>
              <tr><th>Mode</th><th>WPM</th><th>Accuracy</th><th>Consistency</th><th>When</th></tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id}>
                  <td><span className="st-mode">{t.test_type === "time" ? `${t.duration_sec}s` : `${t.word_count}w`}</span></td>
                  <td className="st-wpm">{t.wpm}</td>
                  <td>{t.accuracy}%</td>
                  <td>{t.consistency != null ? `${t.consistency}%` : "–"}</td>
                  <td className="st-dim">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Trend({ values }: { values: number[] }) {
  const W = 640, H = 200, pad = 28;
  const min = Math.min(...values), max = Math.max(...values), r = max - min || 1;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (W - pad * 2), H - pad - ((v - min) / r) * (H - pad * 2)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="st-trend" role="img" aria-label="WPM across your recent tests, oldest to newest">
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="var(--border)" />
      <path d={d} fill="none" stroke="var(--blue-500)" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--surface)" stroke="var(--blue-500)" strokeWidth="2" />
      ))}
      <text x={pad} y={16} className="st-ax">{Math.round(max)} WPM</text>
      <text x={pad} y={H - 8} className="st-ax">{Math.round(min)}</text>
    </svg>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center py-24">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="mb-6" style={{ color: "var(--text-dim)" }}>{desc}</p>
      <Link href="/login" className="btn-primary tn-btn">
        Sign in
      </Link>
    </div>
  );
}

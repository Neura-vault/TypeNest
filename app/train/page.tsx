import { createClient } from "@/lib/supabase/server";
import KeyboardHeatmap from "@/components/KeyboardHeatmap";
import { computeWeakKeys } from "@/lib/weakKeys";

export default async function TrainPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold mb-2">Sign in to open your coach</h2>
        <p style={{ color: "var(--text-dim)" }}>Your coach needs real saved tests to analyze.</p>
      </div>
    );
  }

  const { data: tests } = await supabase
    .from("typing_tests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: charStats } = await supabase
    .from("char_stats")
    .select("*")
    .eq("user_id", user.id)
    .gte("attempts", 3);

  if (!tests || tests.length === 0) {
    return (
      <div>
        <header className="cp-head">
          <h1>Coach</h1>
          <p>Built entirely from your own saved tests. No external AI calls.</p>
        </header>
        <p className="pd-empty">No data yet. Complete a couple of Practice tests and your coach will analyse your speed, accuracy and weak keys.</p>
      </div>
    );
  }

  const n = tests.length;
  const avgWpm = Math.round(tests.reduce((a, t) => a + Number(t.wpm), 0) / n);
  const avgAcc = Math.round(tests.reduce((a, t) => a + Number(t.accuracy), 0) / n);
  const avgCons = Math.round(tests.reduce((a, t) => a + Number(t.consistency ?? 0), 0) / n);

  let speedTrend: "improving" | "declining" | "steady" | "insufficient" = "insufficient";
  let speedDeltaPct = 0;
  if (n >= 4) {
    const half = Math.floor(n / 2);
    const firstAvg = tests.slice(0, half).reduce((a, t) => a + Number(t.wpm), 0) / half;
    const secondAvg = tests.slice(half).reduce((a, t) => a + Number(t.wpm), 0) / (n - half);
    speedDeltaPct = Math.round(((secondAvg - firstAvg) / Math.max(1, firstAvg)) * 100);
    speedTrend = speedDeltaPct > 6 ? "improving" : speedDeltaPct < -6 ? "declining" : "steady";
  }

  const weakKeys = computeWeakKeys(charStats ?? [], 0.12, 5);

  const { data: reviewRows } = await supabase
    .from("char_review_state")
    .select("char, next_due_at")
    .eq("user_id", user.id)
    .in("char", weakKeys.map((k) => k.char).length > 0 ? weakKeys.map((k) => k.char) : ["\0"]);

  const reviewByChar = new Map((reviewRows ?? []).map((r) => [r.char, r.next_due_at as string]));
  const nowMs = Date.now();
  const dueChars = weakKeys
    .map((k) => k.char)
    .filter((c) => {
      const dueAt = reviewByChar.get(c);
      return !dueAt || new Date(dueAt).getTime() <= nowMs;
    });

  const overall = Math.round(
    (Math.min(100, (avgWpm / 80) * 100) + avgAcc + avgCons) / 3
  );

  return (
    <div>
      <header className="cp-head">
        <h1>Coach</h1>
        <p>Built entirely from your own saved tests. No external AI calls.</p>
      </header>

      <div className="ms-grid">
        <aside className="ms-level">
          <p className="pf-label">Overall score</p>
          <div className="ms-lv">{overall}<span className="ac-of">%</span></div>
          <div className="ms-bar"><div style={{ width: `${overall}%` }} /></div>
          <dl className="co-stats">
            <div><dt>Average WPM</dt><dd>{avgWpm}</dd></div>
            <div><dt>Accuracy</dt><dd>{avgAcc}%</dd></div>
            <div><dt>Consistency</dt><dd>{avgCons}%</dd></div>
            <div><dt>Tests</dt><dd>{n}</dd></div>
          </dl>
        </aside>

        <section>
          <p className="pf-label">What to work on</p>
          <ul className="co-list">
            {weakKeys.length > 0 && (
              <CoachCard
                title="Weak key focus"
                body={`Your ${weakKeys.map((k) => k.char).join(", ")} key${weakKeys.length > 1 ? "s are" : " is"} missing about ${Math.round(
                  weakKeys[0].rate * 100
                )}% of the time. That is your fastest fix.`}
              />
            )}
            {speedTrend === "improving" && (
              <CoachCard title="Speed is climbing" body={`Your recent tests are about ${speedDeltaPct}% faster than earlier ones. Keep going.`} />
            )}
            {speedTrend === "declining" && (
              <CoachCard title="Speed dipped recently" body={`Your latest tests are running ${Math.abs(speedDeltaPct)}% slower, often just fatigue.`} />
            )}
            {avgAcc < 90 && (
              <CoachCard title="Accuracy before speed" body={`At ${avgAcc}% accuracy, pushing WPM further will mostly add errors. Aim for 95% or more first.`} />
            )}
            {weakKeys.length === 0 && speedTrend !== "declining" && avgAcc >= 90 && (
              <CoachCard title="Solid session" body="No red flags right now. Keep testing and the coach keeps analysing." />
            )}
          </ul>

          <div className="co-review">
            <p className="pf-label">Spaced repetition</p>
            {weakKeys.length === 0 ? (
              <p className="pd-lab" style={{ marginTop: 10 }}>
                Complete a few more tests so the coach has weak keys worth scheduling reviews for.
              </p>
            ) : (
              <>
                <p className="co-review-t">
                  {dueChars.length > 0
                    ? `${dueChars.length} key${dueChars.length > 1 ? "s are" : " is"} due: ${dueChars.map((c) => c.toUpperCase()).join(", ")}`
                    : "Nothing due right now"}
                </p>
                <p className="pd-lab">
                  {dueChars.length > 0
                    ? "Keys you nail move further out, like Anki. Keys you miss come back tomorrow."
                    : "You are on top of your weak keys. Drill anyway to get ahead, or check back later."}
                </p>
                <a href="/train/drill" className="btn-primary tn-btn" style={{ marginTop: 16 }}>
                  {dueChars.length > 0 ? "Start review drill" : "Start weak-key drill"}
                </a>
              </>
            )}
          </div>
        </section>
      </div>

      <section className="co-heat">
        <p className="pf-label">Keyboard heatmap</p>
        <p className="pd-lab" style={{ margin: "6px 0 22px" }}>
          Built from every test you have saved. Darker keys are the ones you miss most often.
        </p>
        <KeyboardHeatmap
          charStats={(charStats ?? []).map((c) => ({ char: c.char, attempts: c.attempts, errors: c.errors }))}
        />
      </section>
    </div>
  );
}

function CoachCard({ title, body }: { title: string; body: string }) {
  return (
    <li className="co-item">
      <h3>{title}</h3>
      <p>{body}</p>
    </li>
  );
}

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
        <h2 className="text-xl font-bold mb-2">Sign in for AI coaching</h2>
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
      <div className="card p-8 text-center" style={{ color: "var(--text-dim)" }}>
        No real data yet — complete a couple of Practice tests and your coach will analyze your actual speed,
        accuracy and weak keys. Runs entirely from your own saved data, no external AI calls.
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
    <div className="py-8">
      <div className="card p-6 grid sm:grid-cols-[auto_1fr] gap-6 items-center mb-5">
        <div className="mx-auto sm:mx-0 relative w-[120px] h-[120px]">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-2)" strokeWidth="12" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="var(--violet-500)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${(overall / 100) * 326.7} 326.7`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-2xl font-bold" style={{ color: "var(--violet-500)" }}>{overall}%</span>
            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>Overall</span>
          </div>
        </div>
        <div>
          <span className="badge mb-2" style={{ color: "var(--violet-500)", borderColor: "var(--violet-500)" }}>🤖 AI Coach</span>
          <p>
            Across <strong>{n}</strong> saved test{n > 1 ? "s" : ""} you&apos;re averaging{" "}
            <strong style={{ color: "var(--blue-500)" }}>{avgWpm} WPM</strong> at{" "}
            <strong style={{ color: "var(--blue-500)" }}>{avgAcc}% accuracy</strong>, with {avgCons}% consistency.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Recommendations</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {weakKeys.length > 0 && (
            <CoachCard
              title="🎯 Weak key focus"
              body={`Your ${weakKeys.map((k) => k.char).join(", ")} key${weakKeys.length > 1 ? "s are" : " is"} missing about ${Math.round(
                weakKeys[0].rate * 100
              )}% of the time — that's your fastest fix.`}
            />
          )}
          {speedTrend === "improving" && (
            <CoachCard title="📈 Speed is climbing" body={`Your recent tests are about ${speedDeltaPct}% faster than earlier ones. Keep going.`} />
          )}
          {speedTrend === "declining" && (
            <CoachCard title="📉 Speed dipped recently" body={`Latest tests are running ${Math.abs(speedDeltaPct)}% slower — often just fatigue.`} />
          )}
          {avgAcc < 90 && (
            <CoachCard title="🎯 Accuracy before speed" body={`At ${avgAcc}% accuracy, pushing WPM further will mostly add errors. Aim for 95%+ first.`} />
          )}
          {weakKeys.length === 0 && speedTrend !== "declining" && avgAcc >= 90 && (
            <CoachCard title="✅ Solid session" body="No red flags right now — keep testing and the coach keeps analyzing." />
          )}
        </div>
      </div>

      <div className="card p-6 mt-5">
        <h2 className="font-semibold mb-1">Keyboard Heatmap</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
          Built from every test you&apos;ve saved — darker keys are the ones you miss most often.
        </p>
        <KeyboardHeatmap
          charStats={(charStats ?? []).map((c) => ({ char: c.char, attempts: c.attempts, errors: c.errors }))}
        />
      </div>

      <div className="card p-6 mt-5">
        <h2 className="font-semibold mb-1">🔁 Spaced Repetition</h2>
        {weakKeys.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Complete a few more tests so the coach has weak keys worth scheduling reviews for.
          </p>
        ) : (
          <>
            <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
              {dueChars.length > 0 ? (
                <>
                  <strong style={{ color: "var(--text)" }}>
                    {dueChars.length} key{dueChars.length > 1 ? "s are" : " is"} due for review
                  </strong>{" "}
                  right now: {dueChars.map((c) => c.toUpperCase()).join(", ")}. Keys you nail move further out (like
                  Anki); keys you miss come right back tomorrow.
                </>
              ) : (
                "Nothing due right now — you're on top of your weak keys. Drill anyway to get ahead, or check back later."
              )}
            </p>
            <a href="/train/drill" className="btn-primary px-5 py-2.5 rounded-xl font-semibold inline-block">
              {dueChars.length > 0 ? "Start Review Drill" : "Start Weak-Key Drill"}
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function CoachCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card hover-lift p-4">
      <h4 className="text-sm font-bold mb-1.5">{title}</h4>
      <p className="text-xs" style={{ color: "var(--text-dim)" }}>{body}</p>
    </div>
  );
}

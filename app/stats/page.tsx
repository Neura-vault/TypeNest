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

  return (
    <div className="py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatTile value={tests.length} label="Tests taken" color="var(--violet-500)" />
        <StatTile value={avgWpm} label="Average WPM" color="var(--blue-500)" />
        <StatTile value={bestWpm} label="Best WPM" color="var(--amber-500)" />
        <StatTile value={`${avgAcc}%`} label="Average accuracy" color="var(--teal-500)" />
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Test history</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-dim)" }}>
              <th className="pb-2.5 font-semibold text-xs uppercase">Mode</th>
              <th className="pb-2.5 font-semibold text-xs uppercase">WPM</th>
              <th className="pb-2.5 font-semibold text-xs uppercase">Accuracy</th>
              <th className="pb-2.5 font-semibold text-xs uppercase">Consistency</th>
              <th className="pb-2.5 font-semibold text-xs uppercase">When</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="py-2.5">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "var(--surface-2)" }}>
                    {t.test_type === "time" ? `${t.duration_sec}s` : `${t.word_count}w`}
                  </span>
                </td>
                <td className="py-2.5 font-bold" style={{ color: "var(--blue-500)" }}>{t.wpm}</td>
                <td className="py-2.5">{t.accuracy}%</td>
                <td className="py-2.5">{t.consistency ?? "—"}%</td>
                <td className="py-2.5" style={{ color: "var(--text-dim)" }}>
                  {new Date(t.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatTile({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="card hover-lift p-5 relative overflow-hidden">
      <span className="absolute top-0 left-0 right-0 h-1" style={{ background: color ?? "var(--surface-3)" }} />
      <div className="font-heading text-2xl font-bold" style={{ color: color ?? "var(--text)" }}>
        {value}
      </div>
      <div className="text-xs font-semibold mt-1" style={{ color: "var(--text-dim)" }}>
        {label}
      </div>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center py-24">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="mb-6" style={{ color: "var(--text-dim)" }}>{desc}</p>
      <Link href="/login" className="btn-primary px-5 py-2.5 rounded-xl font-semibold inline-block">
        Sign In
      </Link>
    </div>
  );
}

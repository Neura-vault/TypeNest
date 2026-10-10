"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RadarChart from "./RadarChart";

export interface TestRow { wpm: number; accuracy: number; consistency: number | null; chars: number; at: string }
export interface Ach { id: string; title: string; desc: string; emoji: string }

const DAY = 86_400_000;
const RANGES = [{ id: "7D", days: 7 }, { id: "30D", days: 30 }, { id: "3M", days: 90 }, { id: "1Y", days: 365 }];
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <svg className="pd-spark" viewBox="0 0 100 36" />;
  const min = Math.min(...data), r = Math.max(...data) - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 32 - ((v - min) / r) * 28]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return (
    <svg className="pd-spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden>
      <path d={`${line} L100 36 L0 36Z`} fill={color} opacity=".12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatCard({ value, label, delta, series, color = "var(--blue-500)" }: {
  value: string | number; label: string; delta?: string | null; series?: number[]; color?: string;
}) {
  return (
    <div className="pd-card pd-stat">
      <div>
        <div className="pd-num">{value}</div>
        <div className="pd-lab">{label}</div>
        {delta && <div className="pd-delta">{delta}</div>}
      </div>
      {series && <Spark data={series} color={color} />}
    </div>
  );
}

export function AchievementGrid({ items, empty }: { items: Ach[]; empty: string }) {
  if (!items.length) return <p className="pd-lab">{empty}</p>;
  return (
    <div className="pd-ach">
      {items.map((a) => (
        <div key={a.id} className="pd-ach-i">
          <span className="pd-ach-e">{a.emoji}</span>
          <b>{a.title}</b>
          <small>{a.desc}</small>
          <i aria-label="Unlocked">✓</i>
        </div>
      ))}
    </div>
  );
}

export default function ProfileDashboard({ tests, achievements, publicView = false }: { tests: TestRow[]; achievements: Ach[]; publicView?: boolean }) {
  const [range, setRange] = useState("30D");

  const d = useMemo(() => {
    const now = Date.now();
    const t = [...tests].sort((a, b) => +new Date(a.at) - +new Date(b.at));
    const wk = t.filter((x) => +new Date(x.at) >= now - 7 * DAY);
    const before = t.filter((x) => +new Date(x.at) < now - 7 * DAY);
    const last = t.slice(-12);
    let run = 0, words = 0;
    const best = last.map((x) => (run = Math.max(run, x.wpm)));
    const wSeries = last.map((x) => (words += x.chars / 5));
    const bestNow = t.length ? Math.max(...t.map((x) => x.wpm)) : 0;
    const bestBefore = before.length ? Math.max(...before.map((x) => x.wpm)) : 0;
    const accDiff = wk.length && before.length ? avg(wk.map((x) => x.accuracy)) - avg(before.map((x) => x.accuracy)) : null;
    const wkWpm = avg(wk.map((x) => x.wpm)), prevWpm = avg(before.map((x) => x.wpm));
    return {
      total: t.length,
      totalSeries: last.map((_, i) => t.length - last.length + i + 1),
      weekCount: wk.length,
      bestNow: Math.round(bestNow), best,
      bestGain: before.length ? Math.round(bestNow - bestBefore) : null,
      acc: Math.round(avg(t.map((x) => x.accuracy))), accSeries: last.map((x) => x.accuracy), accDiff,
      words: Math.round(t.reduce((a, x) => a + x.chars / 5, 0)), wSeries,
      weekWords: Math.round(wk.reduce((a, x) => a + x.chars / 5, 0)),
      wkWpm, prevWpm, hasWk: wk.length > 0, hasBefore: before.length > 0
    };
  }, [tests]);

  const perf = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days ?? 30;
    const f = tests.filter((x) => +new Date(x.at) >= Date.now() - days * DAY);
    const cons = f.filter((x) => x.consistency != null).map((x) => Number(x.consistency));
    return {
      n: f.length,
      items: [
        { label: "Speed", value: Math.min(100, Math.round((avg(f.map((x) => x.wpm)) / 80) * 100)), color: "var(--blue-500)" },
        { label: "Accuracy", value: Math.round(avg(f.map((x) => x.accuracy))), color: "var(--green-500)" },
        { label: "Consistency", value: Math.round(avg(cons)), color: "var(--violet-500)" },
        { label: "Activity", value: Math.min(100, Math.round(f.reduce((a, x) => a + x.chars / 5, 0) / 5)), color: "var(--rose-500)" }
      ]
    };
  }, [tests, range]);

  const gain = d.hasWk && d.hasBefore ? d.wkWpm - d.prevWpm : null;
  const msg =
    d.total === 0 ? { t: "Take your first test", b: "Your numbers will build up here as you type." }
    : !d.hasWk ? { t: "No tests this week", b: "A short session keeps your streak and progress moving." }
    : gain === null ? { t: "Good start", b: "Keep going. Trends appear once you have a week of history." }
    : gain >= 1 ? { t: "Your progress looks great", b: `Your average speed this week is ${Math.round(gain)} WPM above your earlier tests.` }
    : gain <= -1 ? { t: "A small dip this week", b: `Your average speed is ${Math.round(-gain)} WPM below earlier. Slow, accurate runs bring it back.` }
    : { t: "Holding steady", b: "Your speed is level with your earlier tests. Try a weak-key drill to push past it." };

  const pos = (n: number | null, unit = "") => (n !== null && n > 0 ? `+${n}${unit} this week` : n === 0 ? `No change this week` : null);

  return (
    <>
      <div className="pd-stats">
        <StatCard value={d.total} label="Total tests" series={d.totalSeries} delta={d.total ? `+${d.weekCount} this week` : null} />
        <StatCard value={d.bestNow} label="Best WPM" series={d.best} color="var(--violet-500)" delta={pos(d.bestGain)} />
        <StatCard value={`${d.acc}%`} label="Avg. accuracy" series={d.accSeries} color="var(--green-500)" delta={d.accDiff === null ? null : pos(Math.round(d.accDiff), "%")} />
        <StatCard value={d.words} label="Words typed" series={d.wSeries} color="var(--amber-500)" delta={d.total ? `+${d.weekWords} this week` : null} />
      </div>

      <div className={publicView ? "pd-main pd-main-1" : "pd-main"}>
        <section className="pd-card pd-perf">
          <div className="pd-row">
            <div>
              <h3>Typing performance</h3>
              <p className="pd-lab">Your overall typing stats and progress.</p>
            </div>
            <div className="pd-tabs" role="tablist">
              {RANGES.map((r) => (
                <button key={r.id} role="tab" aria-selected={range === r.id} data-on={range === r.id} onClick={() => setRange(r.id)}>{r.id}</button>
              ))}
            </div>
          </div>
          {perf.n === 0 ? (
            <p className="pd-empty">No tests in this range yet.</p>
          ) : (
            <div className="pd-perf-body">
              <div className="pd-radar"><RadarChart items={perf.items} /></div>
              <ul className="pd-metrics">
                {perf.items.map((m) => (
                  <li key={m.label}>
                    <span>{m.label}</span><b>{m.value}</b>
                    <div className="pd-bar"><div style={{ width: `${m.value}%`, background: m.color }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {!publicView && (
          <aside className="pd-card pd-prog">
            <h3>{msg.t}</h3>
            <p>{msg.b}</p>
            <Link href="/stats" className="btn-secondary tn-btn">View detailed stats →</Link>
          </aside>
        )}
      </div>

      <section className="pd-card pd-achwrap">
        <div className="pd-row">
          <div>
            <h3>Achievements ({achievements.length})</h3>
            <p className="pd-lab">Complete challenges and unlock badges.</p>
          </div>
        </div>
        <AchievementGrid items={achievements} empty="Nothing unlocked yet. Take a test to earn your first one." />
      </section>
    </>
  );
}

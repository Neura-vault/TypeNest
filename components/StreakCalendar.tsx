// GitHub-style contribution calendar for practice activity. Reads from
// practice_sessions, which has existed (and been written to on every
// submitted test) since migrations 0002/0015 — no schema change needed.

interface DaySession {
  date: string; // "YYYY-MM-DD"
  count: number;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function levelColor(count: number): string {
  if (count <= 0) return "var(--surface-2)";
  if (count === 1) return "color-mix(in srgb, var(--teal-500) 30%, var(--surface-2))";
  if (count <= 2) return "color-mix(in srgb, var(--teal-500) 55%, var(--surface-2))";
  if (count <= 4) return "color-mix(in srgb, var(--teal-500) 80%, var(--surface-2))";
  return "var(--teal-500)";
}

export default function StreakCalendar({ sessions }: { sessions: DaySession[] }) {
  const countByDate = new Map(sessions.map((s) => [s.date, s.count]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const WEEKS = 26; // ~6 months — enough to see a real pattern without an overwhelming grid
  const totalDays = WEEKS * 7;

  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  start.setDate(start.getDate() - start.getDay()); // align to the preceding Sunday

  const days: { date: Date; key: string; count: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = toDateKey(cursor);
    days.push({ date: new Date(cursor), key, count: countByDate.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const activeDays = days.filter((d) => d.count > 0).length;

  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) currentStreak++;
    else break;
  }

  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ weekIndex: wi, label: week[0].date.toLocaleDateString("en-US", { month: "short" }) });
      lastMonth = m;
    }
  });

  const CELL = 12;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Practice Streak</h3>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {activeDays} active day{activeDays === 1 ? "" : "s"} in the last {WEEKS} weeks
          </p>
        </div>
        {currentStreak > 0 && (
          <span className="badge" style={{ color: "var(--amber-700)" }}>
            🔥 {currentStreak}-day streak
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: weeks.length * CELL + 20 }}>
          <div className="relative mb-1.5" style={{ height: 14 }}>
            {monthLabels.map((m) => (
              <span
                key={`${m.weekIndex}-${m.label}`}
                className="absolute text-[10px] font-medium"
                style={{ left: m.weekIndex * CELL, color: "var(--text-dim)" }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((d) => (
                  <div
                    key={d.key}
                    title={`${d.date.toLocaleDateString()} — ${d.count} test${d.count === 1 ? "" : "s"}`}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: levelColor(d.count)
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
        <span>Less</span>
        {[0, 1, 2, 4, 6].map((c) => (
          <span
            key={c}
            style={{ width: 10, height: 10, borderRadius: 3, background: levelColor(c), display: "inline-block" }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

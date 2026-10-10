"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { createClient } from "@/lib/supabase/client";

interface Row { username: string; avatar_url: string | null; races: number; wins: number; best_wpm: number; avg_wpm: number }
const MODES = [
  { n: 2, label: "1v1" },
  { n: 3, label: "3 players" },
  { n: 4, label: "4 players" }
];

export default function RaceLeaderboard() {
  const [n, setN] = useState(2);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let dead = false;
    setRows(null);
    createClient()
      .rpc("get_race_leaderboard", { p_players: n })
      .then(({ data }) => !dead && setRows((data as Row[]) ?? []));
    return () => { dead = true; };
  }, [n]);

  return (
    <section id="leaderboard" className="pd-card p-5 md:p-6 mt-4">
      <div className="pd-row">
        <div>
          <h3 className="font-bold text-lg">Race leaderboard</h3>
          <p className="pd-lab">Ranked by wins, then fastest winning WPM.</p>
        </div>
        <div className="pd-tabs">
          {MODES.map((m) => (
            <button key={m.n} data-on={n === m.n} onClick={() => setN(m.n)}>{m.label}</button>
          ))}
        </div>
      </div>
      {rows === null ? (
        <p className="pd-empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="pd-empty">No finished {MODES.find((m) => m.n === n)?.label} races yet. Be the first on this board.</p>
      ) : (
        <ol className="rc-board">
          {rows.map((r, i) => (
            <li key={r.username}>
              <span className="rc-rank" data-top={i < 3 ? i + 1 : undefined}>{i + 1}</span>
              <Avatar url={r.avatar_url} name={r.username} size={32} />
              <Link href={`/u/${r.username}`} className="rc-user">{r.username}</Link>
              <span className="rc-cell"><b>{r.wins}</b><small>wins</small></span>
              <span className="rc-cell"><b>{Math.round(r.best_wpm)}</b><small>best WPM</small></span>
              <span className="rc-cell rc-hide"><b>{r.races}</b><small>races</small></span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

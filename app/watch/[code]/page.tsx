"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Row {
  room_id: string; status: string; max_players: number; word_count: number;
  user_id: string | null; username: string | null; wpm: number | null; place: number | null; finished_at: string | null;
}

const LABEL: Record<string, string> = { waiting: "Waiting for players", racing: "Race in progress", finished: "Race finished" };

export default function WatchPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [live, setLive] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let dead = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data, error: err } = await supabase.rpc("get_race_spectator", { p_code: code });
      if (dead) return;
      if (err) return setError(err.message.includes("JWT") ? "Sign in to watch races." : "Could not load this race.");
      const list = (data ?? []) as Row[];
      if (!list.length) return setError("Room not found.");
      setRows(list);
      if (!roomRef.current) {
        roomRef.current = list[0].room_id;
        channel = supabase
          .channel(`race-room-${roomRef.current}`)
          .on("broadcast", { event: "progress" }, (msg) => {
            const p = msg.payload as { userId: string; percent: number };
            setLive((m) => new Map(m).set(p.userId, p.percent));
          })
          .subscribe();
      }
    }
    load();
    const t = setInterval(load, 3000);
    return () => {
      dead = true;
      clearInterval(t);
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  if (error) return <div className="rc"><p className="pd-empty">{error}</p></div>;
  if (!rows) return <div className="rc"><p className="pd-empty">Loading race…</p></div>;

  const status = rows[0].status;
  const players = rows.filter((r) => r.user_id);

  return (
    <div className="rc">
      <div className="rc-top">
        <div>
          <p className="pd-lab">Spectating · room {code}</p>
          <h1>{LABEL[status] ?? "Race"}</h1>
        </div>
        <Link href="/multiplayer" className="btn-ghost tn-btn">Back</Link>
      </div>
      <section className="pd-card rc-panel">
        {players.length === 0 ? (
          <p className="pd-empty">Nobody has joined yet.</p>
        ) : (
          <div className="rc-lanes">
            {players.map((p) => {
              const pct = p.finished_at ? 100 : Math.min(100, live.get(p.user_id as string) ?? 0);
              return (
                <div key={p.user_id} className="rc-lane">
                  <span className="rc-av">{p.username?.[0]?.toUpperCase()}</span>
                  <div className="rc-track">
                    <div className="rc-fill" style={{ width: `${pct}%` }} />
                    <span className="rc-car" style={{ left: `calc(${pct}% - 10px)` }} />
                  </div>
                  <span className="rc-pct">{p.place ? `#${p.place}` : `${pct}%`}</span>
                </div>
              );
            })}
          </div>
        )}
        {status === "finished" && (
          <ol className="rc-stand">
            {players.map((p) => (
              <li key={p.user_id}>
                <span>{p.place ?? "–"}</span>
                <b>{p.username}</b>
                <em>{p.wpm != null ? `${Math.round(p.wpm)} WPM` : ""}</em>
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className="rc-hint">You are watching only. Players cannot see you.</p>
    </div>
  );
}

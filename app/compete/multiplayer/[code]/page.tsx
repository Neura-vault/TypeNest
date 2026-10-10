"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Confetti from "@/components/Confetti";
import { computeWpm, computeAccuracy } from "@/lib/wpm";

interface Participant {
  user_id: string;
  username: string;
  wpm: number | null;
  accuracy: number | null;
  place: number | null;
  finished_at: string | null;
  eloDelta: number | null;
  eloRatingAfter: number | null;
}

interface RoomState {
  id: string;
  code: string;
  status: "waiting" | "racing" | "finished";
  wordList: string[];
  maxPlayers: number;
  hostId: string;
  startedAt: string | null;
}

type Phase = "loading" | "lobby" | "countdown" | "racing" | "finished" | "error";

export default function RaceRoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [youId, setYouId] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [liveProgress, setLiveProgress] = useState<Map<string, number>>(new Map());
  const [myResult, setMyResult] = useState<{ wpm: number; accuracy: number; place: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [emotes, setEmotes] = useState<{ id: number; name: string; text: string }[]>([]);
  const lastEmoteRef = useRef(0);
  const [rematchCode, setRematchCode] = useState<string | null>(null);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [outcome, setOutcome] = useState<"win" | "lose" | null>(null);
  const [shake, setShake] = useState(false);

  const roomRef = useRef<RoomState | null>(null);
  const wordIndexRef = useRef(0);
  const currentInputRef = useRef("");
  const correctCharsRef = useRef(0);
  const totalTypedRef = useRef(0);
  const raceStartRef = useRef<number | null>(null);
  const keysRef = useRef<number[]>([]);
  const finishedRef = useRef(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const refreshRoom = useCallback(async () => {
    const res = await fetch(`/api/race-rooms/${code}`);
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data?.error ?? "Could not load this room.");
      setPhase("error");
      return;
    }
    setYouId(data.you);
    setParticipants(data.participants);
    setRoom({
      id: data.room.id,
      code: data.room.code,
      status: data.room.status,
      wordList: data.room.wordList,
      maxPlayers: data.room.maxPlayers,
      hostId: data.room.hostId,
      startedAt: data.room.startedAt
    });
  }, [code]);

  // Join (idempotent — safe even if already a participant) then load state.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/api/race-rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Could not join this room.");
        if (cancelled) return;
        await refreshRoom();
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
        setPhase("error");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [code, refreshRoom]);

  // Once room state loads, decide the phase from its status.
  useEffect(() => {
    if (!room) return;
    if (room.status === "waiting") setPhase("lobby");
    else if (room.status === "finished") setPhase("finished");
    else if (room.status === "racing" && !finishedRef.current) setPhase("countdown");
  }, [room?.status]);

  // Realtime: lobby joins, room status flips, and other players' live
  // progress bars. One channel carries both Postgres Changes (durable
  // state) and Broadcast (ephemeral per-keystroke progress).
  useEffect(() => {
    if (!room?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`race-room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "race_participants", filter: `room_id=eq.${room.id}` },
        () => {
          refreshRoom();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "race_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const next = payload.new as { status: RoomState["status"]; started_at: string | null };
          setRoom((r) => (r ? { ...r, status: next.status, startedAt: next.started_at } : r));
        }
      )
      .on("broadcast", { event: "progress" }, (msg) => {
        const p = msg.payload as { userId: string; percent: number };
        setLiveProgress((prev) => {
          const next = new Map(prev);
          next.set(p.userId, p.percent);
          return next;
        });
      })
      .on("broadcast", { event: "emote" }, (msg) => {
        const m = msg.payload as { name?: string; text?: string };
        if (m.name && m.text) pushEmote(String(m.name).slice(0, 24), m.text);
      })
      .on("broadcast", { event: "rematch" }, (msg) => {
        const c = (msg.payload as { code?: string }).code;
        if (c) setRematchCode(c);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room?.id, refreshRoom]);

  // Countdown → racing, timed off the server's shared started_at so every
  // player's race begins at the same instant regardless of network lag.
  useEffect(() => {
    if (phase !== "countdown" || !room?.startedAt) return;

    const targetMs = new Date(room.startedAt).getTime();

    const interval = setInterval(() => {
      const remaining = targetMs - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        raceStartRef.current = targetMs;
        keysRef.current = [];
        setPhase("racing");
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        setCountdownText(Math.ceil(remaining / 1000).toString());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [phase, room?.startedAt]);

  function computeProgressPercent(): number {
    const list = roomRef.current?.wordList ?? [];
    const totalChars = list.reduce((sum, w) => sum + w.length + 1, 0) || 1;
    const doneChars =
      list.slice(0, wordIndexRef.current).reduce((sum, w) => sum + w.length + 1, 0) + currentInputRef.current.length;
    return Math.min(100, Math.round((doneChars / totalChars) * 100));
  }

  // Broadcast this player's progress a few times a second while racing.
  useEffect(() => {
    if (phase !== "racing" || !youId) return;

    const interval = setInterval(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "progress",
        payload: { userId: youId, percent: computeProgressPercent() }
      });
    }, 200);

    return () => clearInterval(interval);
  }, [phase, youId]);

  useEffect(() => {
    if (phase !== "finished" || outcome || !youId) return;
    const me = participants.find((p) => p.user_id === youId);
    if (me?.place != null) setOutcome(me.place === 1 ? "win" : "lose");
  }, [phase, outcome, participants, youId]);

  // Disconnect handling: if a player never finishes, the server closes the
  // race 30 seconds after the first finisher so ratings are not left hanging.
  useEffect(() => {
    if (phase !== "finished" || !room || room.status === "finished") return;
    let tries = 0;
    const t = setInterval(async () => {
      if (++tries > 30) return clearInterval(t);
      await fetch("/api/race-rooms/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id })
      }).catch(() => null);
      refreshRoom();
    }, 5000);
    return () => clearInterval(t);
  }, [phase, room, refreshRoom]);

  // Safety net: realtime can drop a message, so re-sync while racing.
  useEffect(() => {
    if (phase !== "racing") return;
    const t = setInterval(refreshRoom, 2000);
    return () => clearInterval(t);
  }, [phase, refreshRoom]);

  // First to finish wins. Everyone else is sent to the result screen at once.
  useEffect(() => {
    if (phase !== "racing" || finishedRef.current || !youId) return;
    if (participants.some((p) => p.user_id !== youId && p.finished_at)) handleFinish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, phase, youId]);

  async function handleFinish(forfeit = false) {
    if (finishedRef.current || !room) return;
    finishedRef.current = true;

    const elapsedMin = raceStartRef.current ? (Date.now() - raceStartRef.current) / 60000 : 1 / 60;
    // Every finished word is exact, so speed counts the characters of the
    // completed words (plus spaces) plus the part of the current word typed.
    const done = room.wordList.slice(0, wordIndexRef.current).reduce((n, w) => n + w.length + 1, 0);
    const typedChars = forfeit ? done + currentInputRef.current.length : done - 1;
    const wpm = computeWpm(Math.max(0, typedChars), elapsedMin);
    const accuracy = totalTypedRef.current ? computeAccuracy(correctCharsRef.current, totalTypedRef.current) : 0;

    setPhase("finished");
    // Someone else already finished first, so this player has lost.
    if (forfeit) setOutcome("lose");

    try {
      const res = await fetch("/api/race-rooms/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, wpm, accuracy, forfeit, keys: forfeit ? undefined : keysRef.current })
      });
      const data = await res.json();
      if (res.ok) {
        setMyResult({ wpm, accuracy, place: data.place });
        setOutcome(data.place === 1 ? "win" : "lose");
      }
    } catch {
      // The race is still "done" for this player locally even if the sync
      // failed — refreshRoom (via realtime) will reconcile once it can.
    }
  }

  // Rematch: the first player to click creates a new room with the same
  // passage in a new order, then tells everyone still on this screen.
  async function handleRematch() {
    if (!room || rematchBusy) return;
    setRematchBusy(true);
    const list = [...room.wordList];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    try {
      const res = await fetch("/api/race-rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordList: list, maxPlayers: room.maxPlayers })
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error ?? "Could not create the rematch room.");
      channelRef.current?.send({ type: "broadcast", event: "rematch", payload: { code: data.code } });
      window.location.href = `/compete/multiplayer/${data.code}`;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not create the rematch room.");
      setRematchBusy(false);
    }
  }

  // Quick emotes: a fixed list only (no free text), one every 2 seconds.
  const EMOTES = ["GG", "Nice one", "So close", "Rematch?", "Well played"];
  function pushEmote(name: string, text: string) {
    if (!EMOTES.includes(text)) return;
    const id = Date.now() + Math.random();
    setEmotes((e) => [...e.slice(-3), { id, name, text }]);
    setTimeout(() => setEmotes((e) => e.filter((x) => x.id !== id)), 4000);
  }
  function sendEmote(text: string) {
    const now = Date.now();
    if (now - lastEmoteRef.current < 2000) return;
    lastEmoteRef.current = now;
    const name = participants.find((p) => p.user_id === youId)?.username ?? "You";
    pushEmote(name, text);
    channelRef.current?.send({ type: "broadcast", event: "emote", payload: { name, text } });
  }

  // One timestamp per accepted key, sent with the finish for server checks.
  function logKeys(n: number) {
    const t = Math.max(0, Date.now() - (raceStartRef.current ?? Date.now()));
    for (let i = 0; i < n && keysRef.current.length < 4000; i++) keysRef.current.push(t);
  }

  function reject() {
    setShake(true);
    setTimeout(() => setShake(false), 220);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (finishedRef.current) return;
    const value = e.target.value;
    const list = room?.wordList ?? [];
    const idx = wordIndexRef.current;
    const target = list[idx] ?? "";
    const isLast = idx === list.length - 1;
    const prev = currentInputRef.current;

    // Space only works when the word is 100% correct. Otherwise it is
    // swallowed and counted as a mistake.
    if (value.endsWith(" ")) {
      totalTypedRef.current += 1;
      if (value.trimEnd() !== target || isLast) {
        reject();
        return;
      }
      correctCharsRef.current += 1;
      logKeys(1);
      wordIndexRef.current = idx + 1;
      currentInputRef.current = "";
      setWordIndex(idx + 1);
      setCurrentInput("");
      return;
    }

    if (value.length > target.length + 6) return;

    if (value.length > prev.length) {
      const added = value.length - prev.length;
      totalTypedRef.current += added;
      logKeys(added);
      if (target.startsWith(value)) correctCharsRef.current += added;
      else reject();
    }
    currentInputRef.current = value;
    setCurrentInput(value);

    // Last word: finishing needs no space, but it must match exactly.
    if (isLast && value === target) {
      wordIndexRef.current = idx + 1;
      setWordIndex(idx + 1);
      handleFinish();
    }
  }

  async function handleStart() {
    if (!room) return;
    try {
      const res = await fetch("/api/race-rooms/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not start the race.");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not start the race.");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/compete/multiplayer/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied — the code itself is still visible.
    }
  }

  if (phase === "loading") {
    return (
      <div className="py-24 text-center" style={{ color: "var(--text-dim)" }}>
        Joining room…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <p className="mb-4" style={{ color: "var(--red-500)" }}>
          {errorMsg}
        </p>
        <a href="/multiplayer" className="btn-secondary tn-btn">
          Back to Multiplayer
        </a>
      </div>
    );
  }

  if (!room) return null;

  const you = participants.find((p) => p.user_id === youId);
  const isHost = room.hostId === youId;
  const words = room.wordList;
  const winner = participants.find((p) => p.place === 1);
  const iWon = outcome === "win";
  const standings = [...participants].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  const slots = Array.from({ length: Math.min(room.maxPlayers, 8) }, (_, i) => participants[i] ?? null);

  return (
    <div className="rc">
      <div className="rc-top">
        <div>
          <p className="pd-lab">Multiplayer race</p>
          <h1>{phase === "lobby" ? "Room lobby" : phase === "countdown" ? "Get ready" : phase === "racing" ? "Race on" : "Race over"}</h1>
        </div>
        <button onClick={handleCopyLink} className="rc-code" title="Copy invite link">
          <span>{room.code}</span>
          <small>{copied ? "Link copied" : "Copy invite link"}</small>
        </button>
        <button
          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/watch/${room.code}`)}
          className="rc-code"
          title="Copy a link friends can use to watch"
        >
          <span style={{ fontSize: 13, letterSpacing: 0 }}>Watch link</span>
          <small>Copy for spectators</small>
        </button>
      </div>

      {participants.length > 1 && (
        <div className="rc-emote-bar" aria-label="Quick emotes">
          {EMOTES.map((t) => (
            <button key={t} onClick={() => sendEmote(t)}>{t}</button>
          ))}
        </div>
      )}
      <div className="rc-toasts" aria-live="polite">
        {emotes.map((e) => (
          <div key={e.id}><b>{e.name}</b> {e.text}</div>
        ))}
      </div>

      {phase === "lobby" && (
        <section className="pd-card rc-panel">
          <div className="pd-row">
            <div>
              <h3>Players</h3>
              <p className="pd-lab">{participants.length} of {room.maxPlayers} seats filled. Share the code to invite friends.</p>
            </div>
          </div>
          <div className="rc-slots">
            {slots.map((p, i) => (
              <div key={i} className="rc-slot" data-empty={!p}>
                {p ? (
                  <>
                    <span className="rc-av">{p.username[0]?.toUpperCase()}</span>
                    <b>{p.username}{p.user_id === youId ? " (you)" : ""}</b>
                    {p.user_id === room.hostId && <span className="badge">Host</span>}
                  </>
                ) : (
                  <span className="rc-wait">Open seat</span>
                )}
              </div>
            ))}
          </div>
          {isHost ? (
            <button onClick={handleStart} disabled={participants.length < 2} className="btn-primary rc-start">
              {participants.length < 2 ? "Waiting for a second player" : "Start race"}
            </button>
          ) : (
            <p className="rc-hint">Waiting for the host to start the race…</p>
          )}
        </section>
      )}

      {phase === "countdown" && (
        <section className="pd-card rc-count">
          <p className="pd-lab">Race starts in</p>
          <div key={countdownText} className="rc-bignum">{countdownText || "GO"}</div>
          <p className="rc-hint">Type each word exactly. A word must be 100% correct before you can move on.</p>
        </section>
      )}

      {(phase === "racing" || phase === "finished") && (
        <section className="pd-card rc-panel">
          <div className="rc-lanes">
            {participants.map((p) => {
              const percent = p.finished_at
                ? 100
                : p.user_id === youId
                  ? computeProgressPercent()
                  : (liveProgress.get(p.user_id) ?? 0);
              return (
                <div key={p.user_id} className="rc-lane" data-me={p.user_id === youId}>
                  <span className="rc-av">{p.username[0]?.toUpperCase()}</span>
                  <div className="rc-track">
                    <div className="rc-fill" style={{ width: `${percent}%` }} />
                    <span className="rc-car" style={{ left: `calc(${percent}% - 10px)` }} />
                  </div>
                  <span className="rc-pct">{p.place === 1 ? "1st" : p.finished_at ? `#${p.place}` : `${percent}%`}</span>
                </div>
              );
            })}
          </div>

          {phase === "racing" && (
            <>
              <div className="rc-text" onClick={() => inputRef.current?.focus()}>
                {words.slice(Math.max(0, wordIndex - 6), wordIndex + 36).map((w, k) => {
                  const abs = Math.max(0, wordIndex - 6) + k;
                  if (abs < wordIndex) return <span key={abs} className="rc-w done">{w}</span>;
                  if (abs > wordIndex) return <span key={abs} className="rc-w">{w}</span>;
                  return (
                    <span key={abs} className="rc-w cur">
                      {w.split("").map((c, ci) => (
                        <span key={ci} data-s={ci < currentInput.length ? (currentInput[ci] === c ? "ok" : "bad") : "todo"}>{c}</span>
                      ))}
                      {currentInput.length > w.length && <span data-s="bad">{currentInput.slice(w.length)}</span>}
                    </span>
                  );
                })}
              </div>
              <input
                ref={inputRef}
                value={currentInput}
                onChange={handleInputChange}
                data-shake={shake}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="rc-input"
                placeholder="Type the highlighted word…"
              />
              <p className="rc-hint">Space only works when the word is perfect. Fix mistakes with backspace.</p>
            </>
          )}

          {phase === "finished" && (
            <div className="rc-result" data-win={outcome === null ? "pending" : iWon}>
              {iWon && <Confetti />}
              <p className="pd-lab">{outcome === null ? "Please wait" : iWon ? "Victory" : "Defeat"}</p>
              <h2>{outcome === null ? "Checking…" : iWon ? "You win!" : "You lost"}</h2>
              <p className="rc-sub">
                {outcome === null
                  ? "Confirming the final result."
                  : iWon
                    ? "You finished first with every word perfect."
                    : winner
                      ? `${winner.username} finished first.`
                      : "Another player finished first."}
              </p>
              {myResult && (
                <div className="rc-stats">
                  <div><b>{myResult.wpm}</b><small>WPM</small></div>
                  <div><b>{myResult.accuracy}%</b><small>Accuracy</small></div>
                  <div><b>#{myResult.place}</b><small>Place</small></div>
                </div>
              )}
              {you?.eloDelta != null ? (
                <p className="rc-elo" data-up={you.eloDelta >= 0}>
                  {you.eloDelta >= 0 ? "+" : ""}{you.eloDelta} rating · now {you.eloRatingAfter}
                </p>
              ) : (
                <p className="rc-hint">Rating updates once the race is settled…</p>
              )}
              <ol className="rc-stand">
                {standings.map((p) => (
                  <li key={p.user_id}>
                    <span>{p.place ?? "–"}</span>
                    <b>{p.username}{p.user_id === youId ? " (you)" : ""}</b>
                    <em>{p.wpm != null ? `${Math.round(p.wpm)} WPM` : ""}</em>
                  </li>
                ))}
              </ol>
              <div className="rc-actions">
                {rematchCode ? (
                  <a href={`/compete/multiplayer/${rematchCode}`} className="btn-primary tn-btn">Join rematch</a>
                ) : (
                  <button onClick={handleRematch} disabled={rematchBusy} className="btn-primary tn-btn">
                    {rematchBusy ? "Creating room…" : "Rematch"}
                  </button>
                )}
                <a href="/multiplayer" className="btn-ghost tn-btn">Leave</a>
                <a href="/multiplayer#leaderboard" className="btn-ghost tn-btn">Leaderboard</a>
              </div>
            </div>
          )}
        </section>
      )}

      {errorMsg && <p className="text-sm text-center mt-3" style={{ color: "var(--red-500)" }}>{errorMsg}</p>}
      {you === undefined && <p className="rc-hint text-center mt-3">Syncing your seat in this room…</p>}
    </div>
  );
}

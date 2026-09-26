"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { scoreWord, computeWpm, computeAccuracy } from "@/lib/wpm";

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

  const roomRef = useRef<RoomState | null>(null);
  const wordIndexRef = useRef(0);
  const currentInputRef = useRef("");
  const correctCharsRef = useRef(0);
  const totalTypedRef = useRef(0);
  const raceStartRef = useRef<number | null>(null);
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

  async function handleFinish() {
    if (finishedRef.current || !room) return;
    finishedRef.current = true;

    const elapsedMin = raceStartRef.current ? (Date.now() - raceStartRef.current) / 60000 : 1 / 60;
    const wpm = computeWpm(correctCharsRef.current, elapsedMin);
    const accuracy = computeAccuracy(correctCharsRef.current, totalTypedRef.current);

    setPhase("finished");

    try {
      const res = await fetch("/api/race-rooms/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, wpm, accuracy })
      });
      const data = await res.json();
      if (res.ok) {
        setMyResult({ wpm, accuracy, place: data.place });
      }
    } catch {
      // The race is still "done" for this player locally even if the sync
      // failed — refreshRoom (via realtime) will reconcile once it can.
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    const list = room?.wordList ?? [];
    const idx = wordIndexRef.current;
    const target = list[idx] ?? "";
    const isLastWord = idx === list.length - 1;
    const trimmedEnd = value.trimEnd();

    const finishedLastWord = isLastWord && trimmedEnd.length > 0 && trimmedEnd.length >= target.length;

    if (value.endsWith(" ") || finishedLastWord) {
      const typed = trimmedEnd;

      if (typed.length > 0) {
        const { total, correct } = scoreWord(typed, target);
        const countSpace = value.endsWith(" ") ? 1 : 0;
        totalTypedRef.current += total + countSpace;
        correctCharsRef.current += correct + countSpace;
      }

      const nextIndex = idx + 1;
      wordIndexRef.current = nextIndex;
      currentInputRef.current = "";
      setWordIndex(nextIndex);
      setCurrentInput("");

      if (nextIndex >= list.length) {
        handleFinish();
      }
      return;
    }

    currentInputRef.current = value;
    setCurrentInput(value);
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
        <a href="/compete/multiplayer" className="btn-secondary px-5 py-2.5 rounded-xl font-semibold inline-block">
          Back to Multiplayer
        </a>
      </div>
    );
  }

  if (!room) return null;

  const you = participants.find((p) => p.user_id === youId);
  const isHost = room.hostId === youId;
  const upcomingWords = room.wordList.slice(wordIndex, wordIndex + 14);

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Multiplayer Race</h1>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {participants.length}/{room.maxPlayers} players
          </p>
        </div>
        <button onClick={handleCopyLink} className="btn-ghost px-4 py-2 rounded-lg text-sm font-semibold font-mono">
          Code: {room.code} · Copy Link
        </button>
      </div>

      {phase === "lobby" && (
        <div className="card p-6 mb-5">
          <h3 className="font-semibold mb-3">Waiting Room</h3>
          <div className="flex flex-col gap-2 mb-5">
            {participants.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between text-sm py-1.5">
                <span className="font-medium">
                  {p.username} {p.user_id === room.hostId && <span className="badge ml-1.5">Host</span>}
                  {p.user_id === youId && <span style={{ color: "var(--text-dim)" }}> (you)</span>}
                </span>
              </div>
            ))}
          </div>
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={participants.length < 2}
              className="btn-primary px-5 py-2.5 rounded-xl font-semibold disabled:opacity-50"
            >
              {participants.length < 2 ? "Need at least 2 players" : "Start Race"}
            </button>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              Waiting for the host to start…
            </p>
          )}
        </div>
      )}

      {phase === "countdown" && (
        <div className="card p-12 mb-5 text-center">
          <p className="text-6xl font-bold" style={{ color: "var(--blue-500)" }}>
            {countdownText || "GO"}
          </p>
        </div>
      )}

      {(phase === "racing" || phase === "finished") && (
        <div className="card p-6 mb-5">
          <div className="flex flex-col gap-3 mb-5">
            {participants.map((p) => {
              const percent = p.finished_at
                ? 100
                : p.user_id === youId
                  ? computeProgressPercent()
                  : (liveProgress.get(p.user_id) ?? 0);
              return (
                <div key={p.user_id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">
                      {p.username}
                      {p.user_id === youId && " (you)"}
                    </span>
                    <span style={{ color: "var(--text-dim)" }}>{p.finished_at ? `Finished · #${p.place}` : `${percent}%`}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        background: p.finished_at ? "var(--teal-500)" : "var(--blue-500)",
                        transition: "width 150ms linear"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {phase === "racing" && (
            <>
              <div className="font-mono text-lg leading-relaxed mb-4 p-4 rounded-xl" style={{ background: "var(--surface-2)" }}>
                {upcomingWords.map((w, i) => (
                  <span
                    key={wordIndex + i}
                    className="mr-2.5"
                    style={{
                      color: i === 0 ? "var(--blue-500)" : "var(--text-dim)",
                      fontWeight: i === 0 ? 700 : 400,
                      textDecoration: i === 0 ? "underline" : "none"
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
              <input
                ref={inputRef}
                value={currentInput}
                onChange={handleInputChange}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-xl border font-mono text-lg"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                placeholder="Type here…"
              />
            </>
          )}

          {phase === "finished" && (
            <div className="text-center py-4">
              {myResult ? (
                <>
                  <p className="text-3xl font-bold mb-1" style={{ color: "var(--amber-700)" }}>
                    #{myResult.place} place
                  </p>
                  <p style={{ color: "var(--text-dim)" }}>
                    {myResult.wpm} WPM · {myResult.accuracy}% accuracy
                  </p>
                  {(() => {
                    const eloDelta = you?.eloDelta ?? null;
                    const eloRatingAfter = you?.eloRatingAfter ?? null;
                    if (eloDelta === null) {
                      return (
                        <p className="mt-2 text-sm" style={{ color: "var(--text-dim)" }}>
                          Rating updates once everyone finishes…
                        </p>
                      );
                    }
                    return (
                      <p className="mt-2 font-semibold" style={{ color: eloDelta >= 0 ? "var(--teal-500)" : "var(--red-500)" }}>
                        {eloDelta >= 0 ? "+" : ""}
                        {eloDelta} rating · now {eloRatingAfter}
                      </p>
                    );
                  })()}
                </>
              ) : (
                <p style={{ color: "var(--text-dim)" }}>Race finished.</p>
              )}
              <a href="/compete/multiplayer" className="btn-primary px-5 py-2.5 rounded-xl font-semibold inline-block mt-5">
                Race Again
              </a>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-sm text-center" style={{ color: "var(--red-500)" }}>
          {errorMsg}
        </p>
      )}

      {you === undefined && (
        <p className="text-xs text-center" style={{ color: "var(--text-dim)" }}>
          Syncing your seat in this room…
        </p>
      )}
    </div>
  );
}

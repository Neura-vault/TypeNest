"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Participant {
  user_id: string;
  username: string;
  joined_at: string;
}

interface Match {
  id: string;
  round: number;
  slot: number;
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  race_room_id: string | null;
  status: "ready" | "done";
  roomCode: string | null;
}

interface Tournament {
  id: string;
  name: string;
  code: string;
  host_id: string;
  max_participants: number;
  status: "registration" | "active" | "finished";
  champion_id: string | null;
}

function roundLabel(matchesInRound: number): string {
  if (matchesInRound === 1) return "Final";
  if (matchesInRound === 2) return "Semifinal";
  if (matchesInRound === 4) return "Quarterfinal";
  return `Round of ${matchesInRound * 2}`;
}

export default function TournamentBracketPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [youId, setYouId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${code}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Could not load this tournament.");
        setLoading(false);
        return;
      }
      setTournament(data.tournament);
      setParticipants(data.participants);
      setMatches(data.matches);
      setUsernames(data.usernames);
      setYouId(data.you);
      setLoading(false);

      // Nudge the bracket forward if the current round just completed.
      // Harmless no-op most of the time; idempotent server-side either way.
      if (data.tournament.status === "active") {
        fetch("/api/tournaments/advance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournamentId: data.tournament.id })
        }).catch(() => {});
      }
    } catch {
      setErrorMsg("Could not load this tournament.");
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!tournament?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`tournament-${tournament.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${tournament.id}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_participants", filter: `tournament_id=eq.${tournament.id}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${tournament.id}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament?.id, refresh]);

  async function handleJoin() {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/tournaments/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not join.");
      await refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStart() {
    if (!tournament) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/tournaments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: tournament.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not start the tournament.");
      await refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/tournaments/${code}`);
    } catch {
      // Clipboard permission denied — the code itself is still visible.
    }
  }

  function nameFor(userId: string | null): string {
    if (!userId) return "—";
    return usernames[userId] ?? "Player";
  }

  if (loading) {
    return <div className="py-24 text-center" style={{ color: "var(--text-dim)" }}>Loading tournament…</div>;
  }

  if (!tournament) {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <p className="mb-4" style={{ color: "var(--red-500)" }}>{errorMsg ?? "Tournament not found."}</p>
        <a href="/tournaments" className="btn-secondary px-5 py-2.5 rounded-xl font-semibold inline-block">
          Back to Tournaments
        </a>
      </div>
    );
  }

  const isParticipant = participants.some((p) => p.user_id === youId);
  const isHost = tournament.host_id === youId;
  const isFull = participants.length >= tournament.max_participants;

  const matchesByRound = new Map<number, Match[]>();
  for (const m of matches) {
    const list = matchesByRound.get(m.round) ?? [];
    list.push(m);
    matchesByRound.set(m.round, list);
  }
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  const myActiveMatch = matches.find(
    (m) => m.status === "ready" && m.roomCode && (m.player1_id === youId || m.player2_id === youId)
  );

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">{tournament.name}</h1>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {tournament.max_participants}-player bracket · {participants.length}/{tournament.max_participants} registered
          </p>
        </div>
        <button onClick={handleCopyLink} className="btn-ghost px-4 py-2 rounded-lg text-sm font-semibold font-mono">
          Code: {tournament.code} · Copy Link
        </button>
      </div>

      {tournament.status === "finished" && tournament.champion_id && (
        <div className="card p-8 mb-5 text-center">
          <p className="text-4xl mb-2">🏆</p>
          <p className="text-2xl font-bold" style={{ color: "var(--amber-700)" }}>
            {nameFor(tournament.champion_id)} wins the tournament!
          </p>
        </div>
      )}

      {myActiveMatch && (
        <div className="card p-5 mb-5 text-center" style={{ borderColor: "var(--blue-500)" }}>
          <p className="font-semibold mb-3">Your match is ready!</p>
          <a
            href={`/compete/multiplayer/${myActiveMatch.roomCode}`}
            className="btn-primary px-5 py-2.5 rounded-xl font-semibold inline-block"
          >
            ▶ Play Your Match
          </a>
        </div>
      )}

      {tournament.status === "registration" && (
        <div className="card p-6 mb-5">
          <h3 className="font-semibold mb-3">
            Registered Players ({participants.length}/{tournament.max_participants})
          </h3>
          <div className="flex flex-col gap-2 mb-5">
            {participants.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between text-sm py-1.5">
                <span className="font-medium">
                  {p.username}
                  {p.user_id === tournament.host_id && <span className="badge ml-1.5">Host</span>}
                  {p.user_id === youId && <span style={{ color: "var(--text-dim)" }}> (you)</span>}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {!isParticipant && !isFull && (
              <button
                onClick={handleJoin}
                disabled={actionLoading}
                className="btn-secondary px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
              >
                Join Tournament
              </button>
            )}
            {isHost && (
              <button
                onClick={handleStart}
                disabled={actionLoading || !isFull}
                className="btn-primary px-5 py-2.5 rounded-xl font-semibold disabled:opacity-50"
              >
                {isFull ? "Start Tournament" : `Need ${tournament.max_participants - participants.length} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {rounds.length > 0 && (
        <div className="flex flex-col gap-4">
          {rounds.map((round) => {
            const roundMatches = (matchesByRound.get(round) ?? []).sort((a, b) => a.slot - b.slot);
            return (
              <div key={round} className="card p-5">
                <h3 className="font-semibold mb-3">{roundLabel(roundMatches.length)}</h3>
                <div className="flex flex-col gap-2">
                  {roundMatches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-sm px-3 py-2 rounded-lg"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <span style={{ fontWeight: m.winner_id === m.player1_id ? 700 : 400 }}>
                        {nameFor(m.player1_id)}
                      </span>
                      <span style={{ color: "var(--text-dim)" }}>vs</span>
                      <span style={{ fontWeight: m.winner_id === m.player2_id ? 700 : 400 }}>
                        {nameFor(m.player2_id)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                        {m.status === "done" ? `${nameFor(m.winner_id)} won` : "In progress"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {errorMsg && (
        <p className="text-sm text-center mt-4" style={{ color: "var(--red-500)" }}>{errorMsg}</p>
      )}
    </div>
  );
}

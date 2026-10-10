"use client";

import RaceLeaderboard from "@/components/RaceLeaderboard";
import QuickRace from "@/components/QuickRace";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SIZES = [2, 4, 8, 16] as const;

interface PublicTournament {
  id: string;
  name: string;
  code: string;
  maxParticipants: number;
  participantCount: number;
}

export default function TournamentsLobbyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]>(8);
  const [isPublic, setIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicTournaments, setPublicTournaments] = useState<PublicTournament[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  useEffect(() => {
    fetch("/api/multiplayer/public")
      .then((res) => res.json())
      .then((data) => setPublicTournaments(data?.tournaments ?? []))
      .catch(() => {})
      .finally(() => setLoadingPublic(false));
  }, []);

  async function handleCreate() {
    if (name.trim().length < 2) {
      setError("Room name needs at least 2 characters.");
      return;
    }
    setLoading("create");
    setError(null);
    try {
      const res = await fetch("/api/multiplayer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, maxParticipants: size, isPublic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create the room.");
      router.push(`/multiplayer/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(null);
    }
  }

  function handleJoin() {
    const trimmed = joinCode.trim();
    if (!trimmed) return;
    router.push(`/multiplayer/${trimmed.toUpperCase()}`);
  }

  async function handleJoinPublic(code: string) {
    setLoading(code);
    setError(null);
    try {
      const res = await fetch("/api/multiplayer/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not join.");
      router.push(`/multiplayer/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(null);
    }
  }

  return (
    <div className="py-8 max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <span className="badge mb-2" style={{ color: "var(--amber-700)" }}>
          Multiplayer
        </span>
        <h1 className="text-2xl font-bold mb-1">Single-Elimination Bracket</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Fill the bracket, then every match is a live race. Lose and you&apos;re out.
        </p>
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-semibold mb-3">Create a Room</h3>
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Room name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Friday Night Showdown"
          className="w-full px-3 py-2.5 rounded-xl border text-sm mt-2 mb-4"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        />

        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Bracket size
        </label>
        <div className="flex gap-2 mt-2 mb-4 flex-wrap">
          {SIZES.map((n) => (
            <button
              key={n}
              onClick={() => setSize(n)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold border"
              style={{
                borderColor: size === n ? "var(--blue-500)" : "var(--border)",
                background: size === n ? "color-mix(in srgb, var(--blue-500) 15%, transparent)" : "transparent",
                color: size === n ? "var(--blue-500)" : "var(--text)"
              }}
            >
              {n === 2 ? "1v1" : n === 4 ? "2v2" : n === 8 ? "3v3" : "4v4"}
            </button>
          ))}
        </div>

        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Visibility
        </label>
        <div className="flex gap-2 mt-2 mb-4">
          <button
            onClick={() => setIsPublic(false)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold border"
            style={{
              borderColor: !isPublic ? "var(--blue-500)" : "var(--border)",
              background: !isPublic ? "color-mix(in srgb, var(--blue-500) 15%, transparent)" : "transparent",
              color: !isPublic ? "var(--blue-500)" : "var(--text)"
            }}
          >
            Private (code only)
          </button>
          <button
            onClick={() => setIsPublic(true)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold border"
            style={{
              borderColor: isPublic ? "var(--blue-500)" : "var(--border)",
              background: isPublic ? "color-mix(in srgb, var(--blue-500) 15%, transparent)" : "transparent",
              color: isPublic ? "var(--blue-500)" : "var(--text)"
            }}
          >
            Public (anyone can join)
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>
          The bracket needs exactly this many players registered before it can start.
        </p>

        <button
          onClick={handleCreate}
          disabled={loading !== null}
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold w-full disabled:opacity-60"
        >
          {loading === "create" ? "Creating…" : "Create Room"}
        </button>
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-semibold mb-3">Join with a Code</h3>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="ROOM CODE"
            maxLength={8}
            className="flex-1 px-3 py-2.5 rounded-xl border text-sm font-mono tracking-widest uppercase"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          />
          <button
            onClick={handleJoin}
            disabled={loading !== null || !joinCode.trim()}
            className="btn-secondary px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
          >
            Join
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-3">Public rooms</h3>
        {loadingPublic ? (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Loading…
          </p>
        ) : publicTournaments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            No open public rooms right now — start one yourself!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {publicTournaments.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: "var(--surface-2)" }}
              >
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {t.participantCount}/{t.maxParticipants} registered
                  </p>
                </div>
                <button
                  onClick={() => handleJoinPublic(t.code)}
                  disabled={loading !== null || t.participantCount >= t.maxParticipants}
                  className="btn-secondary px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {loading === t.code ? "Joining…" : t.participantCount >= t.maxParticipants ? "Full" : "Join"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-center mt-4" style={{ color: "var(--red-500)" }}>
          {error}
        </p>
      )}
      <QuickRace />
      <RaceLeaderboard />
    </div>
  );
}

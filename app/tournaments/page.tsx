"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SIZES = [4, 8, 16, 32] as const;

export default function TournamentsLobbyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]>(8);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (name.trim().length < 2) {
      setError("Tournament name needs at least 2 characters.");
      return;
    }
    setLoading("create");
    setError(null);
    try {
      const res = await fetch("/api/tournaments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, maxParticipants: size })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create tournament.");
      router.push(`/tournaments/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(null);
    }
  }

  function handleJoin() {
    const trimmed = joinCode.trim();
    if (!trimmed) return;
    router.push(`/tournaments/${trimmed.toUpperCase()}`);
  }

  return (
    <div className="py-8 max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <span className="badge mb-2" style={{ color: "var(--amber-700)" }}>
          🏆 Tournaments
        </span>
        <h1 className="text-2xl font-bold mb-1">Single-Elimination Bracket</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Fill the bracket, then every match is a live 1v1 race. Lose and you&apos;re out.
        </p>
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-semibold mb-3">Create a Tournament</h3>
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Tournament name
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
        <div className="flex gap-2 mt-2 mb-5">
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
              {n} players
            </button>
          ))}
        </div>

        <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>
          The bracket needs exactly this many players registered before it can start.
        </p>

        <button
          onClick={handleCreate}
          disabled={loading !== null}
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold w-full disabled:opacity-60"
        >
          {loading === "create" ? "Creating…" : "Create Tournament"}
        </button>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-3">Join a Tournament</h3>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="TOURNAMENT CODE"
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

      {error && (
        <p className="text-sm text-center mt-4" style={{ color: "var(--red-500)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

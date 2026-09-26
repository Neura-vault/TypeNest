"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateWordList, WORD_BANK } from "@/lib/wordBank";

export default function MultiplayerLobbyPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading("create");
    setError(null);
    try {
      const wordList = generateWordList(80, false, false, WORD_BANK);
      const res = await fetch("/api/race-rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordList, maxPlayers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create room.");
      router.push(`/compete/multiplayer/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(null);
    }
  }

  function handleJoin() {
    const trimmed = joinCode.trim();
    if (!trimmed) return;
    router.push(`/compete/multiplayer/${trimmed.toUpperCase()}`);
  }

  return (
    <div className="py-8 max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <span className="badge mb-2" style={{ color: "var(--violet-500)", borderColor: "var(--violet-500)" }}>
          🏁 Multiplayer
        </span>
        <h1 className="text-2xl font-bold mb-1">Race Live, With Friends</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          2 to 8 players, one shared word list, real-time progress bars.
        </p>
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-semibold mb-3">Create a Room</h3>
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Max players
        </label>
        <div className="flex gap-2 mt-2 mb-5">
          {[2, 4, 6, 8].map((n) => (
            <button
              key={n}
              onClick={() => setMaxPlayers(n)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold border"
              style={{
                borderColor: maxPlayers === n ? "var(--blue-500)" : "var(--border)",
                background: maxPlayers === n ? "color-mix(in srgb, var(--blue-500) 15%, transparent)" : "transparent",
                color: maxPlayers === n ? "var(--blue-500)" : "var(--text)"
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={loading !== null}
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold w-full disabled:opacity-60"
        >
          {loading === "create" ? "Creating…" : "Create Room"}
        </button>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-3">Join a Room</h3>
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

      {error && (
        <p className="text-sm text-center mt-4" style={{ color: "var(--red-500)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

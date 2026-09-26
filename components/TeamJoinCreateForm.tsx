"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMOJI_CHOICES = ["🏳️", "🔥", "⚡", "🚀", "🦁", "🐉", "🛡️", "🌊"];

export default function TeamJoinCreateForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (name.trim().length < 2) {
      setError("Team name needs at least 2 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create team.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not join team.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setMode("create")}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold border"
          style={{
            borderColor: mode === "create" ? "var(--blue-500)" : "var(--border)",
            background: mode === "create" ? "color-mix(in srgb, var(--blue-500) 15%, transparent)" : "transparent",
            color: mode === "create" ? "var(--blue-500)" : "var(--text)"
          }}
        >
          Create a Team
        </button>
        <button
          onClick={() => setMode("join")}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold border"
          style={{
            borderColor: mode === "join" ? "var(--blue-500)" : "var(--border)",
            background: mode === "join" ? "color-mix(in srgb, var(--blue-500) 15%, transparent)" : "transparent",
            color: mode === "join" ? "var(--blue-500)" : "var(--text)"
          }}
        >
          Join with a Code
        </button>
      </div>

      {mode === "create" ? (
        <>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Team name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Night Owls"
            className="w-full px-3 py-2.5 rounded-xl border text-sm mt-2 mb-4"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          />

          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Badge
          </label>
          <div className="flex gap-2 mt-2 mb-5 flex-wrap">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-xl text-lg border flex items-center justify-center"
                style={{
                  borderColor: emoji === e ? "var(--blue-500)" : "var(--border)",
                  background: emoji === e ? "color-mix(in srgb, var(--blue-500) 15%, transparent)" : "var(--surface-2)"
                }}
              >
                {e}
              </button>
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="btn-primary px-5 py-2.5 rounded-xl font-semibold w-full disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Team"}
          </button>
        </>
      ) : (
        <>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Team code
          </label>
          <div className="flex gap-2 mt-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={8}
              placeholder="TEAM CODE"
              className="flex-1 px-3 py-2.5 rounded-xl border text-sm font-mono tracking-widest uppercase"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            />
            <button
              onClick={handleJoin}
              disabled={loading || !code.trim()}
              className="btn-secondary px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
            >
              Join
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-center mt-4" style={{ color: "var(--red-500)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaveTeamButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams/leave", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not leave the team.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: "var(--text-dim)" }}>Leave this team?</span>
        <button
          onClick={handleLeave}
          disabled={loading}
          className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60"
          style={{ color: "var(--red-500)" }}
        >
          {loading ? "Leaving…" : "Yes, leave"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="btn-ghost px-3 py-1.5 rounded-lg text-sm font-semibold"
        >
          Cancel
        </button>
        {error && <span className="text-xs" style={{ color: "var(--red-500)" }}>{error}</span>}
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="btn-ghost px-3 py-1.5 rounded-lg text-sm font-semibold">
      Leave Team
    </button>
  );
}

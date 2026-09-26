"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface MissionRowProps {
  mission: { id: string; title: string; target: number; xp: number; color: string };
  progress: number;
  claimed: boolean;
}

export default function MissionRow({ mission, progress, claimed }: MissionRowProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localClaimed, setLocalClaimed] = useState(claimed);
  const done = progress >= mission.target;

  async function handleClaim() {
    setBusy(true);
    const res = await fetch("/api/missions/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId: mission.id })
    });
    setBusy(false);
    if (res.ok) {
      setLocalClaimed(true);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-t first:border-t-0" style={{ borderColor: "var(--border)" }}>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
        style={{ background: `${mission.color}22`, color: mission.color }}
      >
        {mission.id.slice(1)}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold mb-1.5">{mission.title}</h4>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
          <div className="h-full rounded-full" style={{ width: `${(progress / mission.target) * 100}%`, background: mission.color }} />
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
          {progress} / {mission.target}
          {localClaimed ? " · claimed" : ""}
        </div>
      </div>
      <span className="text-xs font-bold w-14 text-right" style={{ color: "var(--amber-500)" }}>
        +{mission.xp} XP
      </span>
      <button
        onClick={handleClaim}
        disabled={!done || localClaimed || busy}
        className="text-xs font-bold px-3.5 py-2 rounded-full shrink-0"
        style={{
          background: !done || localClaimed ? "var(--surface-2)" : "var(--amber-grad)",
          color: !done || localClaimed ? "var(--text-dim)" : "#fff"
        }}
      >
        {localClaimed ? "Claimed" : busy ? "…" : "Claim"}
      </button>
    </div>
  );
}

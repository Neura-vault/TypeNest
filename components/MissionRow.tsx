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

  const claimable = done && !localClaimed && !busy;

  return (
    <div className="ms-row" data-done={done}>
      <span className="ms-mark" aria-hidden="true">
        {done && (
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3 3 7-7" />
          </svg>
        )}
      </span>
      <div className="ms-body">
        <h4 className="ms-t">{mission.title}</h4>
        <div className="ms-track" role="progressbar" aria-valuemin={0} aria-valuemax={mission.target} aria-valuenow={progress}>
          <div style={{ width: `${(progress / mission.target) * 100}%` }} />
        </div>
        <div className="ms-prog">
          {progress} of {mission.target}
          {localClaimed ? ", claimed" : ""}
        </div>
      </div>
      <span className="ms-xp">+{mission.xp} XP</span>
      <button
        onClick={handleClaim}
        disabled={!claimable}
        className={claimable ? "btn-primary tn-btn ms-claim" : "btn-ghost tn-btn ms-claim"}
      >
        {localClaimed ? "Claimed" : busy ? "Claiming" : "Claim"}
      </button>
    </div>
  );
}

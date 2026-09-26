"use client";

import { useCallback, useState } from "react";
import TypingEngine from "./TypingEngine";
import { generateWeakKeyWordList, WORD_BANK } from "@/lib/wordBank";

interface DrillResult {
  charStats: Record<string, { attempts: number; errors: number }>;
}

export default function DrillClient({
  chars,
  isReview
}: {
  chars: string[];
  isReview: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const customWordGenerator = useCallback(
    () => generateWeakKeyWordList(150, chars, WORD_BANK),
    [chars]
  );

  const handleFinish = useCallback(
    async (result: DrillResult) => {
      const results = chars
        .map((c) => {
          const s = result.charStats[c];
          if (!s || s.attempts < 2) return null;
          return { char: c, passed: s.errors / s.attempts < 0.15 };
        })
        .filter((r): r is { char: string; passed: boolean } => r !== null);

      if (results.length === 0) return;

      setStatus("submitting");

      try {
        const res = await fetch("/api/char-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results })
        });

        if (!res.ok) throw new Error("review submission failed");

        const data = await res.json();
        setXpEarned(typeof data?.xpAwarded === "number" ? data.xpAwarded : null);
        setStatus("done");
      } catch {
        // Non-critical: the drill itself already happened for the user.
        // A failed sync just means tomorrow's due list is a bit stale.
        setStatus("error");
      }
    },
    [chars]
  );

  return (
    <div>
      <div className="card p-4 mb-5 text-center">
        <span
          className="badge"
          style={{ color: "var(--violet-500)", borderColor: "var(--violet-500)" }}
        >
          {isReview ? "🔁 Spaced-Repetition Review" : "🎯 Weak-Key Drill"}
        </span>
        <p className="text-sm mt-2" style={{ color: "var(--text-dim)" }}>
          This session is loaded with words containing:{" "}
          <strong>{chars.map((c) => c.toUpperCase()).join(", ")}</strong>
        </p>
        {status === "done" && (
          <p className="text-sm mt-2 font-semibold" style={{ color: "var(--teal-500)" }}>
            Review logged{xpEarned ? ` — +${xpEarned} XP` : ""}. Keys you nailed move further out; keys you missed
            come back tomorrow.
          </p>
        )}
      </div>

      <TypingEngine customWordGenerator={customWordGenerator} onFinish={handleFinish} />
    </div>
  );
}

"use client";

import TypingEngine from "@/components/typing/TypingEngine";
import { saveGuestResult } from "@/lib/guestResults";

interface TestFinishResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  backspaces: number;
  charactersTyped: number;
  durationSec: number | null;
  wordCount: number | null;
  charStats: Record<string, { attempts: number; errors: number }>;
  keystrokes: [number, number][];
}

export default function PracticePage() {
  async function handleFinish(result: TestFinishResult) {
    const payload = {
      testType: result.durationSec ? ("time" as const) : ("words" as const),
      contentType: "words",
      language: "en",
      durationSec: result.durationSec,
      wordCount: result.wordCount,
      wpm: result.wpm,
      rawWpm: result.rawWpm,
      accuracy: result.accuracy,
      consistency: result.consistency,
      errors: result.errors,
      backspaces: result.backspaces,
      charactersTyped: result.charactersTyped,
      charStats: result.charStats,
      keystrokes: result.keystrokes,
      punctuation: false,
      numbers: false
    };

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        saveGuestResult(payload);
      }
    } catch {
      saveGuestResult(payload);
    }
  }

  return <TypingEngine onFinish={handleFinish} />;
}

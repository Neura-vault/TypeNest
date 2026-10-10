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
  contentType?: string;
  language?: string;
  punctuation?: boolean;
  numbers?: boolean;
}

export default function PracticePage() {
  async function handleFinish(result: TestFinishResult) {
    const payload = {
      testType: result.durationSec ? ("time" as const) : ("words" as const),
      contentType: result.contentType ?? "words",
      language: result.language ?? "en",
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
      punctuation: result.punctuation ?? false,
      numbers: result.numbers ?? false
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

  return (
    <div>
      <div className="pd-row">
        <div>
          <h1>Practice</h1>
          <p className="pd-lab">Pick a mode, then start typing. The test begins on your first key.</p>
        </div>
        <p className="px-keys">
          <kbd>Tab</kbd> + <kbd>Enter</kbd> restart <span>·</span> <kbd>Esc</kbd> exit
        </p>
      </div>
      <TypingEngine onFinish={handleFinish} />
    </div>
  );
}

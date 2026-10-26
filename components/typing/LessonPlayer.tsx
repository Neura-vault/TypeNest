"use client";

import { useState, useRef } from "react";
import type { Lesson } from "@/lib/academy";

export default function LessonPlayer({ lesson, onDone }: { lesson: Lesson; onDone: (passed: boolean) => void }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<{ wpm: number; accuracy: number; passed: boolean } | null>(null);
  const correctChars = useRef(0);
  const totalTyped = useRef(0);
  const startTime = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function finalizeWord(t: string, target: string) {
    const len = Math.max(t.length, target.length);
    let correct = 0;
    for (let i = 0; i < len; i++) {
      if (i < t.length) totalTyped.current++;
      if (i < target.length && i < t.length && target[i] === t[i]) correct++;
    }
    correctChars.current += correct;
  }

  async function finish(finalTyped: string) {
    if (finalTyped) finalizeWord(finalTyped, lesson.words[wordIndex]);
    const elapsedMin = startTime.current ? (Date.now() - startTime.current) / 60000 : 1 / 60;
    const wpm = Math.round(correctChars.current / 5 / (elapsedMin || 1 / 60));
    const accuracy = totalTyped.current ? Math.round((correctChars.current / totalTyped.current) * 100) : 100;
    const passed = accuracy >= 90;
    setResult({ wpm, accuracy, passed });

    try {
      await fetch("/api/academy/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, wpm, accuracy })
      });
    } catch {
      // Non-fatal — result still shows even if the save fails.
    }
    onDone(passed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!startTime.current) startTime.current = Date.now();
    if (e.key === "Backspace") {
      e.preventDefault();
      setTyped((t) => t.slice(0, -1));
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      if (typed.length === 0) return;
      finalizeWord(typed, lesson.words[wordIndex]);
      const next = wordIndex + 1;
      if (next >= lesson.words.length) {
        finish("");
        return;
      }
      setWordIndex(next);
      setTyped("");
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const next = typed + e.key;
      setTyped(next);
      if (wordIndex === lesson.words.length - 1 && next.length >= lesson.words[wordIndex].length) {
        finish(next);
      }
    }
  }

  if (result) {
    return (
      <div className="text-center py-6">
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-4">
          <div className="card p-4"><div className="font-heading text-xl font-bold" style={{ color: "var(--blue-500)" }}>{result.wpm}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>WPM</div></div>
          <div className="card p-4"><div className="font-heading text-xl font-bold">{result.accuracy}%</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>Accuracy</div></div>
        </div>
        <p className="font-bold" style={{ color: result.passed ? "#1FA463" : "#E24B4B" }}>
          {result.passed ? "✓ Lesson passed" : "Below 90% accuracy — try again"}
        </p>
      </div>
    );
  }

  return (
    <div onClick={() => inputRef.current?.focus({ preventScroll: true })} className="relative cursor-text">
      <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>{lesson.intro}</p>
      <div className="text-xl leading-loose font-heading">
        {lesson.words.map((w, wi) => (
          <span key={wi} className="inline-block mr-2.5 mb-1.5">
            {w.split("").map((c, ci) => {
              let color = "var(--text-dim)";
              if (wi === wordIndex) {
                if (ci < typed.length) color = typed[ci] === c ? "var(--text)" : "#E24B4B";
              } else if (wi < wordIndex) {
                color = "var(--text)";
              }
              return <span key={ci} style={{ color }}>{c}</span>;
            })}
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        value=""
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute opacity-0 pointer-events-none top-0 left-0 w-px h-px"
      />
      <p className="text-sm mt-4" style={{ color: "var(--text-dim)" }}>Word {Math.min(wordIndex + 1, lesson.words.length)} of {lesson.words.length} — click to begin</p>
    </div>
  );
}

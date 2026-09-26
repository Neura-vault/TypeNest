"use client";

import { useRef, useState } from "react";
import { dailySeed, generateSeededWords, generateWordList, WORD_BANK } from "@/lib/wordBank";

type View = "menu" | "challenge" | "race";

export default function CompetePage() {
  const [view, setView] = useState<View>("menu");

  if (view === "challenge") return <ChallengeRunner onBack={() => setView("menu")} />;
  if (view === "race") return <RaceRunner onBack={() => setView("menu")} />;

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Compete</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>Race the clock, a Pace Bot, or the whole leaderboard.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card hover-lift p-5">
          <div className="icon-tile lg solid tile-amber mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-1">Daily Challenge</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
            Same text for every player today — seeded from today&apos;s date.
          </p>
          <button onClick={() => setView("challenge")} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">
            Attempt Today&apos;s Challenge
          </button>
        </div>
        <div className="card hover-lift p-5">
          <div className="icon-tile lg solid tile-violet mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-1">Race a Pace Bot</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
            Pick a difficulty and race a pace bot aiming for that speed.
          </p>
          <button onClick={() => setView("race")} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">
            Start a Race
          </button>
        </div>
        <div className="card hover-lift p-5">
          <div className="icon-tile lg tile-blue mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12v6a6 6 0 0 1-12 0V4z M12 16v4M8 20h8" />
            </svg>
          </div>
          <h3 className="font-semibold mb-1">Multiplayer Race</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
            Race 2-8 real players live — same words, same clock, real-time progress bars. Every race is rated.
          </p>
          <div className="flex gap-2 flex-wrap">
            <a href="/compete/multiplayer" className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-block">
              Create or Join a Race
            </a>
            <a href="/compete/ranked" className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold inline-block">
              Ranked Leaderboard
            </a>
            <a href="/tournaments" className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold inline-block">
              🏆 Tournaments
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChallengeRunner({ onBack }: { onBack: () => void }) {
  const words = useRef(generateSeededWords(40, dailySeed())).current;
  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<{ wpm: number; accuracy: number } | null>(null);
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
    if (finalTyped) finalizeWord(finalTyped, words[wordIndex]);
    const elapsedMin = startTime.current ? (Date.now() - startTime.current) / 60000 : 1 / 60;
    const wpm = Math.round(correctChars.current / 5 / (elapsedMin || 1 / 60));
    const accuracy = totalTyped.current ? Math.round((correctChars.current / totalTyped.current) * 100) : 100;
    setResult({ wpm, accuracy });
    try {
      await fetch("/api/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wpm, accuracy }) });
    } catch {
      // guest/network — non-fatal
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!startTime.current) startTime.current = Date.now();
    if (e.key === "Backspace") { e.preventDefault(); setTyped((t) => t.slice(0, -1)); return; }
    if (e.key === " ") {
      e.preventDefault();
      if (typed.length === 0) return;
      finalizeWord(typed, words[wordIndex]);
      const next = wordIndex + 1;
      if (next >= words.length) { finish(""); return; }
      setWordIndex(next);
      setTyped("");
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const next = typed + e.key;
      setTyped(next);
      if (wordIndex === words.length - 1 && next.length >= words[wordIndex].length) finish(next);
    }
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="btn-ghost mb-5 px-4 py-2 rounded-xl text-sm font-semibold">← Back</button>
      {result ? (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Challenge attempt complete</h2>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <div className="card p-4"><div className="font-heading text-xl font-bold" style={{ color: "var(--blue-500)" }}>{result.wpm}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>WPM</div></div>
            <div className="card p-4"><div className="font-heading text-xl font-bold">{result.accuracy}%</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>Accuracy</div></div>
          </div>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.focus({ preventScroll: true })} className="relative cursor-text">
          <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>Same 40-word passage for everyone today.</p>
          <div className="text-xl leading-loose font-heading">
            {words.map((w, wi) => (
              <span key={wi} className="inline-block mr-2.5 mb-1.5">
                {w.split("").map((c, ci) => {
                  let color = "var(--text-dim)";
                  if (wi === wordIndex && ci < typed.length) color = typed[ci] === c ? "var(--text)" : "#E24B4B";
                  else if (wi < wordIndex) color = "var(--text)";
                  return <span key={ci} style={{ color }}>{c}</span>;
                })}
              </span>
            ))}
          </div>
          <input ref={inputRef} value="" onChange={() => {}} onKeyDown={handleKeyDown} autoComplete="off" aria-hidden="true" tabIndex={-1} className="absolute opacity-0 pointer-events-none top-0 left-0 w-px h-px" />
        </div>
      )}
    </div>
  );
}

const PACE_LEVELS = {
  beginner: { min: 15, max: 25 }, easy: { min: 28, max: 38 }, normal: { min: 42, max: 55 },
  hard: { min: 58, max: 75 }, expert: { min: 78, max: 95 }, insane: { min: 100, max: 130 }
} as const;
type PaceLevel = keyof typeof PACE_LEVELS;

function RaceRunner({ onBack }: { onBack: () => void }) {
  const [level, setLevel] = useState<PaceLevel>("normal");
  const [started, setStarted] = useState(false);
  const [words] = useState(() => generateWordList(30, false, false, WORD_BANK));
  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [aiChars, setAiChars] = useState(0);
  const [result, setResult] = useState<{ won: boolean; wpm: number; aiWpm: number } | null>(null);

  const correctChars = useRef(0);
  const totalTyped = useRef(0);
  const startTime = useRef<number | null>(null);
  const aiTarget = useRef(0);
  const aiTick = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const totalChars = words.join(" ").length;

  function start() {
    aiTarget.current = PACE_LEVELS[level].min + Math.random() * (PACE_LEVELS[level].max - PACE_LEVELS[level].min);
    setStarted(true);
    setAiChars(0);
    aiTick.current = setInterval(() => {
      setAiChars((c) => {
        const jitter = 0.7 + Math.random() * 0.6;
        const charsPerSec = (aiTarget.current * 5) / 60;
        const nc = Math.min(totalChars, c + charsPerSec * 0.2 * jitter);
        if (nc >= totalChars) finish(false);
        return nc;
      });
    }, 200);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  }

  function finalizeWord(t: string, target: string) {
    const len = Math.max(t.length, target.length);
    let correct = 0;
    for (let i = 0; i < len; i++) {
      if (i < t.length) totalTyped.current++;
      if (i < target.length && i < t.length && target[i] === t[i]) correct++;
    }
    correctChars.current += correct;
  }

  async function finish(playerWon: boolean) {
    if (aiTick.current) clearInterval(aiTick.current);
    const elapsedMin = startTime.current ? (Date.now() - startTime.current) / 60000 : 1 / 60;
    const wpm = Math.round(correctChars.current / 5 / (elapsedMin || 1 / 60));
    setResult({ won: playerWon, wpm, aiWpm: Math.round(aiTarget.current) });
    try {
      await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: level, won: playerWon, playerWpm: wpm, aiWpm: aiTarget.current })
      });
    } catch {
      // guest/network — non-fatal
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!startTime.current) startTime.current = Date.now();
    if (e.key === "Backspace") { e.preventDefault(); setTyped((t) => t.slice(0, -1)); return; }
    if (e.key === " ") {
      e.preventDefault();
      if (typed.length === 0) return;
      finalizeWord(typed, words[wordIndex]);
      const next = wordIndex + 1;
      if (next >= words.length) { finish(true); return; }
      setWordIndex(next);
      setTyped("");
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const next = typed + e.key;
      setTyped(next);
      if (wordIndex === words.length - 1 && next.length >= words[wordIndex].length) {
        finalizeWord(next, words[wordIndex]);
        finish(true);
      }
    }
  }

  const youPct = Math.min(100, Math.round((totalTyped.current / totalChars) * 100));
  const aiPct = Math.min(100, Math.round((aiChars / totalChars) * 100));

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="btn-ghost mb-5 px-4 py-2 rounded-xl text-sm font-semibold">← Back</button>

      {result ? (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: result.won ? "#1FA463" : "#E24B4B" }}>
            {result.won ? "🏁 You won the race!" : "The Pace Bot finished first"}
          </h2>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mt-4">
            <div className="card p-4"><div className="font-heading text-xl font-bold" style={{ color: "var(--blue-500)" }}>{result.wpm}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>Your WPM</div></div>
            <div className="card p-4"><div className="font-heading text-xl font-bold" style={{ color: "var(--amber-500)" }}>{result.aiWpm}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>Pace Bot WPM</div></div>
          </div>
        </div>
      ) : !started ? (
        <div className="text-center">
          <h3 className="font-bold mb-4">Pick a difficulty</h3>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {(Object.keys(PACE_LEVELS) as PaceLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className="text-sm font-semibold px-3.5 py-2 rounded-full border"
                style={{ borderColor: level === l ? "var(--blue-500)" : "var(--border)", background: level === l ? "var(--blue-500)" : "transparent", color: level === l ? "#fff" : "var(--text-dim)" }}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={start} className="btn-primary px-6 py-3 rounded-xl font-semibold">Start Race</button>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.focus({ preventScroll: true })} className="relative cursor-text">
          <div className="flex flex-col gap-3 mb-6">
            <RaceLane label="You" pct={youPct} color="var(--blue-500)" />
            <RaceLane label={`Pace Bot (${level})`} pct={aiPct} color="var(--amber-500)" />
          </div>
          <div className="text-xl leading-loose font-heading">
            {words.map((w, wi) => (
              <span key={wi} className="inline-block mr-2.5 mb-1.5">
                {w.split("").map((c, ci) => {
                  let color = "var(--text-dim)";
                  if (wi === wordIndex && ci < typed.length) color = typed[ci] === c ? "var(--text)" : "#E24B4B";
                  else if (wi < wordIndex) color = "var(--text)";
                  return <span key={ci} style={{ color }}>{c}</span>;
                })}
              </span>
            ))}
          </div>
          <input ref={inputRef} value="" onChange={() => {}} onKeyDown={handleKeyDown} autoComplete="off" aria-hidden="true" tabIndex={-1} className="absolute opacity-0 pointer-events-none top-0 left-0 w-px h-px" />
        </div>
      )}
    </div>
  );
}

function RaceLane({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold w-20 shrink-0" style={{ color }}>{label}</span>
      <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color: "var(--text-dim)" }}>{pct}%</span>
    </div>
  );
}

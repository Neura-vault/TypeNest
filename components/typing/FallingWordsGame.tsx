"use client";

import { useEffect, useRef, useState } from "react";
import { pick, WORD_BANK } from "@/lib/wordBank";

interface FallingWord {
  id: number;
  text: string;
  y: number;
  speed: number;
}

const DIFFICULTY = {
  easy: { spawnMs: 1700, minSpeed: 34, maxSpeed: 52, lives: 5 },
  normal: { spawnMs: 1250, minSpeed: 55, maxSpeed: 80, lives: 4 },
  hard: { spawnMs: 900, minSpeed: 82, maxSpeed: 120, lives: 3 }
} as const;

type Difficulty = keyof typeof DIFFICULTY;

export default function FallingWordsGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [words, setWords] = useState<FallingWord[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [typedLen, setTypedLen] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [lives, setLives] = useState<number>(DIFFICULTY.normal.lives);

  const nextId = useRef(1);
  const scoreRef = useRef(0);
  const clearedRef = useRef(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);

  // Leaving the Arcade mid-game (navigating away) used to leave both
  // intervals running in the background forever — a memory leak, and
  // state updates firing on an unmounted component.
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, []);

  function spawnWord() {
    const cfg = DIFFICULTY[difficulty];
    const speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
    setWords((w) => [...w, { id: nextId.current++, text: pick(WORD_BANK).toLowerCase(), y: -24, speed }]);
  }

  function start() {
    const cfg = DIFFICULTY[difficulty];
    setRunning(true);
    setGameOver(false);
    setWords([]);
    setActiveId(null);
    setTypedLen(0);
    setScore(0);
    setCombo(0);
    setCleared(0);
    scoreRef.current = 0;
    clearedRef.current = 0;
    setLives(cfg.lives);
    startedAt.current = Date.now();

    if (tickRef.current) clearInterval(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);

    spawnRef.current = setInterval(spawnWord, cfg.spawnMs);
    tickRef.current = setInterval(tickFrame, 33);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  }

  function tickFrame() {
    const arenaHeight = arenaRef.current?.clientHeight ?? 420;
    setWords((prev) => {
      const survivors: FallingWord[] = [];
      let livesLost = 0;
      for (const w of prev) {
        const ny = w.y + w.speed * (33 / 1000);
        if (ny >= arenaHeight - 26) {
          livesLost++;
        } else {
          survivors.push({ ...w, y: ny });
        }
      }
      if (livesLost > 0) {
        setLives((l) => {
          const newLives = l - livesLost;
          if (newLives <= 0) endGame();
          return Math.max(0, newLives);
        });
        setCombo(0);
        setActiveId((id) => (survivors.some((w) => w.id === id) ? id : null));
      }
      return survivors;
    });
  }

  function endGame() {
    setRunning(false);
    setGameOver(true);
    if (tickRef.current) clearInterval(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    // Save exactly once, here — not during render (which would re-fire on
    // every re-render and spam the API). Refs hold the final values.
    saveScore(scoreRef.current, clearedRef.current);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!running) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      setTypedLen((l) => Math.max(0, l - 1));
      return;
    }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    const key = e.key.toLowerCase();

    if (activeId !== null) {
      const w = words.find((x) => x.id === activeId);
      if (!w) { setActiveId(null); setTypedLen(0); return; }
      if (w.text[typedLen] === key) {
        const newLen = typedLen + 1;
        if (newLen >= w.text.length) {
          clearWord(w.id);
        } else {
          setTypedLen(newLen);
        }
      }
      return;
    }

    const candidates = words.filter((w) => w.text[0] === key).sort((a, b) => b.y - a.y);
    if (candidates.length === 0) return;
    const chosen = candidates[0];
    if (chosen.text.length === 1) {
      clearWord(chosen.id);
    } else {
      setActiveId(chosen.id);
      setTypedLen(1);
    }
  }

  function clearWord(id: number) {
    setWords((prev) => prev.filter((w) => w.id !== id));
    setActiveId(null);
    setTypedLen(0);
    clearedRef.current += 1;
    setCleared(clearedRef.current);
    setCombo((c) => {
      const nc = c + 1;
      const multiplier = Math.min(5, 1 + Math.floor((nc - 1) / 3));
      scoreRef.current += 10 * multiplier;
      setScore(scoreRef.current);
      return nc;
    });
  }

  async function saveScore(finalScore: number, finalCleared: number) {
    try {
      await fetch("/api/games/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: "falling-words", score: finalScore, wordsCleared: finalCleared, difficulty })
      });
    } catch {
      // guest or network hiccup — non-fatal
    }
  }

  if (gameOver) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-bold mb-4">Game Over</h2>
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-6">
          <div className="card p-4"><div className="font-heading text-xl font-bold" style={{ color: "var(--amber-500)" }}>{score}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>Score</div></div>
          <div className="card p-4"><div className="font-heading text-xl font-bold">{cleared}</div><div className="text-xs" style={{ color: "var(--text-dim)" }}>Cleared</div></div>
        </div>
        <button onClick={start} className="btn-primary px-5 py-2.5 rounded-xl font-semibold">Play Again</button>
      </div>
    );
  }

  if (!running) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-bold mb-4">Falling Words</h3>
        <div className="flex justify-center gap-2 mb-6">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className="text-sm font-semibold px-4 py-2 rounded-full border"
              style={{
                borderColor: difficulty === d ? "var(--blue-500)" : "var(--border)",
                background: difficulty === d ? "var(--blue-500)" : "transparent",
                color: difficulty === d ? "#fff" : "var(--text-dim)"
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <button onClick={start} className="btn-primary px-6 py-3 rounded-xl font-semibold">Start Game</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3 text-sm font-bold">
        <span>Score: {score}</span>
        <span>{"❤️".repeat(lives)}{"🖤".repeat(DIFFICULTY[difficulty].lives - lives)}</span>
        <span>Cleared: {cleared}</span>
      </div>
      <div
        ref={arenaRef}
        onClick={() => inputRef.current?.focus({ preventScroll: true })}
        className="relative h-[420px] rounded-2xl border overflow-hidden cursor-text"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {words.map((w) => (
          <div
            key={w.id}
            className="absolute font-heading font-semibold text-lg"
            style={{ left: `${(w.id * 37) % 80}%`, top: w.y, color: w.id === activeId ? "var(--text)" : "var(--text-dim)" }}
          >
            {w.id === activeId ? (
              <>
                <span style={{ color: "#fff", background: "var(--blue-500)", borderRadius: 3 }}>{w.text.slice(0, typedLen)}</span>
                {w.text.slice(typedLen)}
              </>
            ) : (
              w.text
            )}
          </div>
        ))}
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
      </div>
    </div>
  );
}

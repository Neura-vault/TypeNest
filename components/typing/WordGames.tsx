"use client";

import { useEffect, useRef, useState } from "react";
import { pick, WORD_BANK } from "@/lib/wordBank";

type Mode = "speed-rush" | "accuracy-survival";
const RUSH_SECONDS = 45;

const COPY: Record<Mode, { title: string; rules: string }> = {
  "speed-rush": {
    title: "Speed Rush",
    rules: `One word at a time for ${RUSH_SECONDS} seconds. The next word appears the moment you finish one. Wrong letters cost you time, so fix them fast.`
  },
  "accuracy-survival": {
    title: "Accuracy Survival",
    rules: "One wrong keystroke ends the run. Words get longer as you survive."
  }
};

function nextWord(mode: Mode, cleared: number): string {
  const min = mode === "accuracy-survival" ? Math.min(3 + Math.floor(cleared / 6), 9) : 3;
  const max = mode === "accuracy-survival" ? min + 3 : 8;
  const pool = WORD_BANK.filter((w) => w.length >= min && w.length <= max && /^[a-z]+$/i.test(w));
  return pick(pool.length ? pool : WORD_BANK);
}

export default function WordGames({ mode }: { mode: Mode }) {
  const [phase, setPhase] = useState<"idle" | "running" | "over">("idle");
  const [word, setWord] = useState("");
  const [input, setInput] = useState("");
  const [cleared, setCleared] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(RUSH_SECONDS);
  const [best, setBest] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const endAt = useRef(0);
  const state = useRef({ score: 0, cleared: 0, penalty: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  function start() {
    state.current = { score: 0, cleared: 0, penalty: 0 };
    setScore(0);
    setCleared(0);
    setInput("");
    setNote(null);
    setWord(nextWord(mode, 0));
    endAt.current = Date.now() + RUSH_SECONDS * 1000;
    setLeft(RUSH_SECONDS);
    setPhase("running");
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  async function finish() {
    setPhase("over");
    const { score: s, cleared: c } = state.current;
    setBest((b) => Math.max(b, s));
    if (s === 0) return;
    try {
      const res = await fetch("/api/games/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: mode, score: Math.min(s, 100000), wordsCleared: c })
      });
      const data = await res.json();
      setNote(res.ok ? `+${data.xpAwarded} XP saved` : (data.error ?? "Score not saved."));
    } catch {
      setNote("Score not saved. Check your connection.");
    }
  }

  // Speed Rush clock. Each wrong letter removes a second via `penalty`.
  useEffect(() => {
    if (phase !== "running" || mode !== "speed-rush") return;
    const t = setInterval(() => {
      const remaining = Math.ceil((endAt.current - state.current.penalty * 1000 - Date.now()) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) finish();
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase !== "running") return;
    const v = e.target.value.trim().toLowerCase();
    if (v.length > input.length && !word.startsWith(v)) {
      if (mode === "accuracy-survival") return finish();
      state.current.penalty += 1;
    }
    if (v === word) {
      state.current.cleared += 1;
      state.current.score += word.length * (mode === "accuracy-survival" ? 10 : 1);
      setCleared(state.current.cleared);
      setScore(state.current.score);
      setWord(nextWord(mode, state.current.cleared));
      setInput("");
      return;
    }
    setInput(v);
  }

  const wrong = input.length > 0 && !word.startsWith(input);
  const wpm = mode === "speed-rush" ? Math.round(score / 5 / (RUSH_SECONDS / 60)) : null;

  return (
    <div className="pd-card wg">
      <div className="pd-row">
        <div>
          <h3>{COPY[mode].title}</h3>
          <p className="pd-lab">{COPY[mode].rules}</p>
        </div>
        <div className="wg-hud">
          {mode === "speed-rush" && <span><b>{left}s</b><small>left</small></span>}
          <span><b>{score}</b><small>score</small></span>
          <span><b>{cleared}</b><small>words</small></span>
        </div>
      </div>

      {phase === "running" && (
        <>
          <div className="wg-word" data-wrong={wrong}>
            {word.split("").map((c, i) => (
              <span key={i} data-s={i < input.length ? (input[i] === c ? "ok" : "bad") : "todo"}>{c}</span>
            ))}
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={onChange}
            className="rc-input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Type the word"
            aria-label="Type the word"
          />
        </>
      )}

      {phase !== "running" && (
        <div className="wg-end">
          {phase === "over" && (
            <>
              <h2>{mode === "speed-rush" ? "Time" : "Run over"}</h2>
              <div className="rc-stats">
                <div><b>{score}</b><small>Score</small></div>
                <div><b>{cleared}</b><small>Words</small></div>
                <div><b>{wpm ?? best}</b><small>{wpm !== null ? "WPM" : "Best"}</small></div>
              </div>
              {note && <p className="rc-hint">{note}</p>}
            </>
          )}
          <button onClick={start} className="btn-primary tn-btn wg-go">{phase === "over" ? "Play again" : "Start"}</button>
        </div>
      )}
    </div>
  );
}

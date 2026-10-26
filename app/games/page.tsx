"use client";

import { useState } from "react";
import FallingWordsGame from "@/components/typing/FallingWordsGame";
import WordGames from "@/components/typing/WordGames";

const GAMES = [
  { id: "falling-words", title: "Falling Words", desc: "Type words before they hit the ground.", playable: true, tile: "tile-rose", icon: "M12 2v14M8 12l4 4 4-4M5 20h14" },
  { id: "speed-rush", title: "Speed Rush", desc: "One word at a time, beat the clock.", playable: true, tile: "tile-amber", icon: "M13 2L3 14h7l-1 8 10-12h-7l1-8z" },
  { id: "accuracy-survival", title: "Accuracy Survival", desc: "One mistake ends the run.", playable: true, tile: "tile-teal", icon: "M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" }
];

export default function GamesPage() {
  const [active, setActive] = useState<string | null>(null);

  if (active) {
    return (
      <div className="py-8 max-w-3xl mx-auto">
        <button onClick={() => setActive(null)} className="btn-ghost tn-btn mb-5">
          Back to arcade
        </button>
        {active === "falling-words" ? <FallingWordsGame /> : <WordGames mode={active as "speed-rush" | "accuracy-survival"} />}
      </div>
    );
  }

  const RULES: Record<string, string> = {
    "falling-words": "Type each word before it reaches the bottom. The pace picks up as you go.",
    "speed-rush": "45 seconds, one word at a time. Every wrong letter costs you a second.",
    "accuracy-survival": "One wrong keystroke ends the run. Words get longer the longer you last."
  };

  return (
    <div>
      <header className="cp-head">
        <h1>Typing arcade</h1>
        <p>Three short games. Every run earns XP and saves your score.</p>
      </header>
      <div className="gm-grid">
        {GAMES.map((g) => (
          <article key={g.id} className="gm">
            {g.id === "falling-words" ? (
              <div className="gm-art gm-fall" aria-hidden="true">
                <span>quiet</span>
                <span>river</span>
                <span>stone</span>
              </div>
            ) : (
              <div className="gm-art" aria-hidden="true">
                <b>{g.id === "speed-rush" ? "45" : "1"}</b>
                <small>{g.id === "speed-rush" ? "seconds on the clock" : "mistake ends the run"}</small>
              </div>
            )}
            <h2>{g.title}</h2>
            <p className="gm-d">{g.desc}</p>
            <p className="gm-r">{RULES[g.id]}</p>
            <button onClick={() => setActive(g.id)} className="gm-play">Play</button>
          </article>
        ))}
      </div>
    </div>
  );
}

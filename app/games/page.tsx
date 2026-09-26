"use client";

import { useState } from "react";
import FallingWordsGame from "@/components/typing/FallingWordsGame";

const GAMES = [
  { id: "falling-words", title: "Falling Words", desc: "Type words before they hit the ground.", playable: true, tile: "tile-rose", icon: "M12 2v14M8 12l4 4 4-4M5 20h14" },
  { id: "speed-rush", title: "Speed Rush", desc: "One word at a time, beat the clock.", playable: false, tile: "tile-amber", icon: "M13 2L3 14h7l-1 8 10-12h-7l1-8z" },
  { id: "accuracy-survival", title: "Accuracy Survival", desc: "One mistake ends the run.", playable: false, tile: "tile-teal", icon: "M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" }
];

export default function GamesPage() {
  const [active, setActive] = useState<string | null>(null);

  if (active === "falling-words") {
    return (
      <div className="py-8 max-w-2xl mx-auto">
        <button onClick={() => setActive(null)} className="btn-ghost mb-5 px-4 py-2 rounded-xl text-sm font-semibold">
          ← Back to Arcade
        </button>
        <FallingWordsGame />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Typing Arcade</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>Play, improve, earn XP.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAMES.map((g) => (
          <div key={g.id} className={`card p-5 ${g.playable ? "hover-lift" : ""}`} style={{ opacity: g.playable ? 1 : 0.6 }}>
            <div className={`icon-tile lg solid ${g.tile} mb-4`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d={g.icon} />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">{g.title}</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>{g.desc}</p>
            <button
              disabled={!g.playable}
              onClick={() => setActive(g.id)}
              className={g.playable ? "btn-primary px-4 py-2 rounded-xl text-sm font-semibold" : "text-sm font-semibold px-4 py-2 rounded-xl badge"}
              style={!g.playable ? { color: "var(--text-dim)" } : undefined}
            >
              {g.playable ? "Play" : "Coming soon"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

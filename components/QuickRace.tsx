"use client";

import { useState } from "react";
import { bankFor, generateWordList } from "@/lib/wordBank";

const LANGS = [
  { id: "en", label: "English" },
  { id: "ur-roman", label: "Roman Urdu" },
  { id: "ur", label: "Urdu" }
] as const;

export default function QuickRace() {
  const [players, setPlayers] = useState(2);
  const [words, setWords] = useState(50);
  const [lang, setLang] = useState<(typeof LANGS)[number]["id"]>("en");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const wordList = generateWordList(words, false, false, bankFor("words", lang));
      const res = await fetch("/api/race-rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordList, maxPlayers: players })
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(res.status === 401 ? "Sign in to create a room." : (data.error ?? "Could not create the room."));
      window.location.href = `/compete/multiplayer/${data.code}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the room.");
      setBusy(false);
    }
  }

  function join() {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return setError("Enter the room code your friend shared.");
    window.location.href = `/compete/multiplayer/${c}`;
  }

  return (
    <section className="pd-card p-5 md:p-6 mb-4">
      <div className="pd-row">
        <div>
          <h3 className="font-bold text-lg">Quick race</h3>
          <p className="pd-lab">Create a room and share the code, or join a friend&apos;s room.</p>
        </div>
      </div>
      <div className="qr-grid">
        <div className="qr-box">
          <label className="pf-label">Players</label>
          <div className="pd-tabs">
            {[2, 3, 4, 6, 8].map((n) => (
              <button key={n} data-on={players === n} onClick={() => setPlayers(n)}>{n}</button>
            ))}
          </div>
          <label className="pf-label">Length</label>
          <div className="pd-tabs">
            {[25, 50, 100].map((n) => (
              <button key={n} data-on={words === n} onClick={() => setWords(n)}>{n} words</button>
            ))}
          </div>
          <label className="pf-label">Language</label>
          <div className="pd-tabs">
            {LANGS.map((l) => (
              <button key={l.id} data-on={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>
            ))}
          </div>
          <button onClick={create} disabled={busy} className="btn-primary tn-btn qr-go">{busy ? "Creating…" : "Create room"}</button>
        </div>
        <div className="qr-box">
          <label className="pf-label">Have a code?</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && join()}
            maxLength={8}
            placeholder="ROOM CODE"
            className="qr-code"
            aria-label="Room code"
          />
          <button onClick={join} className="btn-ghost tn-btn qr-go">Join room</button>
        </div>
      </div>
      {error && <p className="text-sm mt-3" style={{ color: "var(--red-500)" }}>{error}</p>}
    </section>
  );
}

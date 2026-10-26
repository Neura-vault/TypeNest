"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const TEXT = "the quick brown fox jumps over the lazy dog while a slow green turtle crosses the quiet road at dawn";

/** A real, playable mini test for the home page. Every number on it is measured live. */
export default function HeroTyper() {
  const [typed, setTyped] = useState("");
  const [keys, setKeys] = useState(0);
  const [errors, setErrors] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!start || end) return;
    const t = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(t);
  }, [start, end]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (end) return;
    const v = e.target.value.slice(0, TEXT.length);
    const t = Date.now();
    if (!start) {
      setStart(t);
      setNow(t);
    }
    if (v.length > typed.length) {
      setKeys((k) => k + 1);
      if (v[v.length - 1] !== TEXT[v.length - 1]) setErrors((x) => x + 1);
    }
    setTyped(v);
    if (v.length === TEXT.length) {
      setEnd(t);
      setNow(t);
    }
  }

  function reset() {
    setTyped(""); setKeys(0); setErrors(0); setStart(null); setEnd(null); setNow(0);
    ref.current?.focus();
  }

  const correct = typed.split("").filter((c, i) => c === TEXT[i]).length;
  const minutes = start ? Math.max(((end ?? now) - start) / 60000, 1 / 600) : 0;
  const wpm = start ? Math.round(correct / 5 / minutes) : 0;
  const acc = keys ? Math.round(((keys - errors) / keys) * 100) : 100;
  const secs = start ? (((end ?? now) - start) / 1000).toFixed(1) : "0.0";

  return (
    <div className="ht">
      <div className="ht-top">
        <span className="pf-label">Try it now</span>
        <button onClick={reset} className="ht-reset">Restart</button>
      </div>
      <div className="ht-text" onClick={() => ref.current?.focus()}>
        {TEXT.split("").map((c, i) => (
          <span key={i} data-s={i < typed.length ? (typed[i] === c ? "ok" : "bad") : i === typed.length ? "cur" : "todo"}>{c}</span>
        ))}
        <input
          ref={ref}
          value={typed}
          onChange={onChange}
          className="ht-input"
          aria-label="Typing practice. Click and start typing."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
      <div className="ht-stats">
        <div><b>{wpm}</b><small>WPM</small></div>
        <div><b>{acc}%</b><small>Accuracy</small></div>
        <div><b>{secs}s</b><small>Time</small></div>
        {end ? (
          <Link href="/practice" className="btn-primary tn-btn">Run a full test</Link>
        ) : (
          <p className="ht-hint">{start ? "Keep going" : "Click the text and start typing"}</p>
        )}
      </div>
    </div>
  );
}

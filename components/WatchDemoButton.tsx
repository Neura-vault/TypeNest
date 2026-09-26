"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const DEMO_TEXT = "the quick brown fox jumps over the lazy dog and types faster every single day";

export default function WatchDemoButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(0);
  const [wpm, setWpm] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!open) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTyped(0);
      setWpm(0);
      return;
    }

    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTyped((n) => {
        const next = n >= DEMO_TEXT.length ? 0 : n + 1;
        if (next === 0) startRef.current = Date.now();
        const elapsedMin = Math.max((Date.now() - startRef.current) / 60000, 1 / 60);
        setWpm(Math.round(next / 5 / elapsedMin));
        return next;
      });
    }, 65);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "btn-ghost px-6 py-3.5 rounded-xl font-semibold"}>
        ▶ Watch Demo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center px-5"
          style={{ background: "rgba(5,10,20,.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="card w-full max-w-xl p-6 relative"
            style={{ boxShadow: "0 24px 60px rgba(11,27,51,.35)" }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close demo"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "var(--surface-2)", color: "var(--text-dim)" }}
            >
              ✕
            </button>

            <h3 className="font-bold text-lg mb-1">See TypeNest in action</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
              A live look at the typing test — this is a simulated preview, not a recording.
            </p>

            <div className="flex justify-center gap-8 mb-5">
              <div className="text-center">
                <div className="font-heading text-3xl font-bold" style={{ color: "var(--blue-500)" }}>{wpm}</div>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>WPM</div>
              </div>
              <div className="text-center">
                <div className="font-heading text-3xl font-bold">{Math.round((typed / DEMO_TEXT.length) * 100)}%</div>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Progress</div>
              </div>
            </div>

            <div
              className="rounded-xl p-5 text-lg leading-relaxed font-heading mb-6"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {DEMO_TEXT.split("").map((c, i) => (
                <span
                  key={i}
                  style={{
                    color: i < typed ? "var(--text)" : "var(--text-dim)",
                    borderBottom: i === typed ? "2px solid var(--blue-500)" : "none"
                  }}
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => setOpen(false)} className="btn-ghost px-5 py-2.5 rounded-xl font-semibold text-sm">
                Close
              </button>
              <Link href="/practice" className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm">
                Try It Yourself →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

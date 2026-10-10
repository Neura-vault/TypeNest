"use client";

import { useEffect, useState } from "react";

const COLORS = ["#2340ff", "#16a05a", "#f59e0b", "#e8456f", "#6d4aff", "#0f9d8a"];
interface Bit { l: number; d: number; t: number; c: string; w: number; x: number }

/** Falling confetti for the winner. Skipped for people who prefer reduced motion. */
export default function Confetti() {
  const [bits, setBits] = useState<Bit[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setBits(
      Array.from({ length: 110 }, () => ({
        l: Math.random() * 100,
        d: Math.random() * 0.9,
        t: 2.8 + Math.random() * 2.4,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        w: 6 + Math.random() * 7,
        x: (Math.random() - 0.5) * 260
      }))
    );
    const id = setTimeout(() => setBits([]), 7000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="cf" aria-hidden>
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.l}%`,
            width: b.w,
            height: b.w * 1.6,
            background: b.c,
            animationDelay: `${b.d}s`,
            animationDuration: `${b.t}s`,
            ["--x" as string]: `${b.x}px`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

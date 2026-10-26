"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lesson } from "@/lib/academy";
import LessonPlayer from "@/components/typing/LessonPlayer";

export default function AcademyClient({
  lessons,
  chain,
  passedIds,
  isLoggedIn
}: {
  lessons: Lesson[];
  chain: string[];
  passedIds: string[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const passedSet = new Set(passedIds);

  function statusFor(id: string): "completed" | "active" | "locked" {
    if (passedSet.has(id)) return "completed";
    const idx = chain.indexOf(id);
    if (idx === 0) return "active";
    const prevId = chain[idx - 1];
    return passedSet.has(prevId) ? "active" : "locked";
  }

  if (!isLoggedIn) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold mb-2">Sign in for the Academy</h2>
        <p style={{ color: "var(--text-dim)" }}>Lesson progress is saved to your account.</p>
      </div>
    );
  }

  if (activeLesson) {
    return (
      <div className="card p-6 max-w-3xl mx-auto">
        <h2 className="font-bold text-lg mb-4">{activeLesson.title}</h2>
        <LessonPlayer
          lesson={activeLesson}
          onDone={() => {
            router.refresh();
          }}
        />
        <button onClick={() => setActiveLesson(null)} className="btn-ghost tn-btn mt-5">
          Back to lessons
        </button>
      </div>
    );
  }

  const done = chain.filter((id) => passedSet.has(id)).length;
  const nextLesson = chain
    .map((id) => lessons.find((l) => l.id === id))
    .find((l) => l && statusFor(l.id) === "active");

  return (
    <div>
      <header className="cp-head">
        <h1>Typing academy</h1>
        <p>Short lessons that build speed from the home row up. Pass a lesson to unlock the next one.</p>
      </header>
      <div className="ms-grid">
        <aside className="ms-level">
          <p className="pf-label">Lessons complete</p>
          <div className="ms-lv">{done}<span className="ac-of">/{chain.length}</span></div>
          <div className="ms-bar"><div style={{ width: `${chain.length ? (done / chain.length) * 100 : 0}%` }} /></div>
          <p className="ms-total">{done === chain.length ? "Every lesson complete." : `${chain.length - done} to go.`}</p>
          {nextLesson && (
            <button onClick={() => setActiveLesson(nextLesson)} className="cp-go">
              {done === 0 ? "Start" : "Continue"}: {nextLesson.title}
            </button>
          )}
        </aside>
        <ol className="ac-list">
          {chain.map((id, i) => {
            const lesson = lessons.find((l) => l.id === id);
            const status = statusFor(id);
            return (
              <li key={id} data-s={status}>
                <span className="ac-n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{lesson?.title ?? id}</h3>
                  <p>{lesson?.intro}</p>
                </div>
                <button
                  className="ac-btn"
                  data-s={status}
                  disabled={status === "locked" || !lesson}
                  onClick={() => lesson && setActiveLesson(lesson)}
                >
                  {status === "completed" ? "Replay" : status === "locked" ? "Locked" : "Start"}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

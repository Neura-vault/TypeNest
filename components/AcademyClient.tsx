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
      <div className="card p-6 max-w-2xl mx-auto">
        <h2 className="font-bold text-lg mb-4">{activeLesson.title}</h2>
        <LessonPlayer
          lesson={activeLesson}
          onDone={() => {
            router.refresh();
          }}
        />
        <button onClick={() => setActiveLesson(null)} className="btn-ghost mt-5 px-4 py-2 rounded-xl text-sm font-semibold">
          Back to Skill Tree
        </button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-2xl mx-auto mb-6 card p-6 relative overflow-hidden" style={{ background: "var(--hero-grad)" }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 -z-10" style={{ background: "#fff", filter: "blur(40px)" }} />
        <p className="relative text-white/80 text-xs font-bold uppercase tracking-wide mb-1">Typing Academy</p>
        <h2 className="relative text-white text-xl font-bold">Learn. Practice. Master.</h2>
      </div>

      <div className="card p-6 max-w-2xl mx-auto">
        <h2 className="font-bold mb-1">Skill Tree</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
          Real lessons — the rest of the Academy unlocks course-by-course in future builds.
        </p>
        {chain.map((id, i) => {
          const lesson = lessons.find((l) => l.id === id);
          const status = statusFor(id);
          return (
            <div key={id} className="flex gap-4 pb-5 relative">
              {i < chain.length - 1 && (
                <span
                  className="absolute left-5 top-10 bottom-0 w-0.5 -translate-x-1/2"
                  style={{ background: status === "completed" ? "var(--blue-500)" : "var(--border)" }}
                />
              )}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10"
                style={{
                  background: status === "active" ? "var(--amber-grad)" : status === "completed" ? "var(--brand-grad)" : "var(--surface-2)",
                  color: status === "locked" ? "var(--text-dim)" : "#fff",
                  boxShadow: status === "active" ? "var(--shadow-glow-amber)" : status === "completed" ? "var(--shadow-glow-blue)" : "none"
                }}
              >
                {status === "completed" ? "✓" : status === "locked" ? "🔒" : "▶"}
              </div>
              <div className="flex-1 pt-1.5">
                <h4 className="font-semibold text-sm">{lesson?.title ?? id}</h4>
                <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
                  {lesson ? lesson.intro : "Not built yet — coming in a future update."}
                </p>
                <button
                  disabled={status === "locked" || !lesson}
                  onClick={() => lesson && setActiveLesson(lesson)}
                  className="text-xs font-bold px-3.5 py-1.5 rounded-lg border"
                  style={{
                    borderColor: "var(--border)",
                    background: status === "active" ? "var(--blue-500)" : "transparent",
                    color: status === "active" ? "#fff" : "var(--text-dim)",
                    opacity: status === "locked" || !lesson ? 0.5 : 1
                  }}
                >
                  {status === "completed" ? "Replay" : status === "locked" ? "Locked" : "Start"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

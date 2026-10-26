import type { Achievement } from "./types";

// XP thresholds: flat 150 XP per level. Kept as a function (not a hardcoded
// table) so the curve can change later without touching call sites.
export function levelFromXp(xp: number): number {
  return Math.floor(xp / 150) + 1;
}

export function xpFloorForLevel(level: number): number {
  return (level - 1) * 150;
}

// Real, deterministic XP formula for a completed test — no random rewards.
export function xpForTest(wpm: number, accuracy: number): number {
  return Math.max(5, Math.round(wpm / 3) + Math.round(accuracy / 10));
}

export function xpForLesson(): number {
  return 25;
}

export function xpForGame(score: number): number {
  return Math.max(5, Math.round(score / 8));
}

export function xpForRace(won: boolean): number {
  return won ? 30 : 12;
}

export function xpForChallenge(wpm: number): number {
  return Math.max(8, Math.round(wpm / 3));
}

// Mission targets live in code (not the database) so they can change
// without a migration. Only *claim state* is persisted server-side.
export const MISSIONS: { id: string; title: string; target: number; xp: number; color: string }[] = [
  { id: "m1", title: "Complete 3 typing tests", target: 3, xp: 20, color: "#1E6FEF" },
  { id: "m2", title: "Type 300 words", target: 300, xp: 25, color: "#1FA463" },
  { id: "m3", title: "Score 90%+ accuracy once", target: 1, xp: 15, color: "#FF8A1E" },
  { id: "m4", title: "Pass an Academy lesson", target: 1, xp: 20, color: "#8B5CF6" },
  { id: "m5", title: "Play 2 arcade games", target: 2, xp: 20, color: "#EC4899" },
  { id: "m6", title: "Win a race against the AI", target: 1, xp: 25, color: "#F59E0B" },
  { id: "m7", title: "Reach 60 WPM in a test", target: 1, xp: 20, color: "#E24B4B" },
  { id: "m8", title: "Attempt the Daily Challenge", target: 1, xp: 15, color: "#14B8A6" },
  { id: "m9", title: "Try Code typing mode", target: 1, xp: 10, color: "#6366F1" }
];

// Mirrors the seed data in supabase/migrations/0003_gamification.sql.
// Kept here too so the client can render locked/unlocked cards without a
// network round trip; the database remains the source of truth for what a
// user has actually unlocked.
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-test", title: "First Steps", desc: "Complete your first test", emoji: "🎯" },
  { id: "three-tests", title: "Warming Up", desc: "Complete 3 tests in one session", emoji: "🔁" },
  { id: "accurate-95", title: "Sharp Shooter", desc: "Score 95%+ accuracy in a test", emoji: "🎯" },
  { id: "perfect-100", title: "Flawless", desc: "Score 100% accuracy in a test", emoji: "💯" },
  { id: "speed-40", title: "Getting Quick", desc: "Reach 40 WPM", emoji: "⚡" },
  { id: "speed-70", title: "Speed Demon", desc: "Reach 70 WPM", emoji: "🔥" },
  { id: "first-lesson", title: "Academy Starter", desc: "Pass your first Academy lesson", emoji: "🎓" },
  { id: "wordsmith", title: "Wordsmith", desc: "Type 500 words in one session", emoji: "📝" },
  { id: "arcade-rookie", title: "Arcade Rookie", desc: "Play a game in the Typing Arcade", emoji: "🕹️" },
  { id: "arcade-ace", title: "Arcade Ace", desc: "Score 200+ points in Falling Words", emoji: "🏆" },
  { id: "challenger", title: "Challenger", desc: "Attempt the Daily Challenge", emoji: "📅" },
  { id: "ai-slayer", title: "AI Slayer", desc: "Beat an AI opponent in a race", emoji: "🤖" }
];

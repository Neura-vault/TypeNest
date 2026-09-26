import { describe, it, expect } from "vitest";
import { levelFromXp, xpFloorForLevel, xpForTest, xpForLesson, xpForGame, xpForRace, xpForChallenge, MISSIONS } from "./gamification";

describe("levelFromXp / xpFloorForLevel", () => {
  it("starts at level 1 with 0 xp", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("levels up every 150 xp", () => {
    expect(levelFromXp(149)).toBe(1);
    expect(levelFromXp(150)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
  });

  it("is the inverse of xpFloorForLevel at level boundaries", () => {
    for (const level of [1, 2, 5, 10]) {
      expect(levelFromXp(xpFloorForLevel(level))).toBe(level);
    }
  });
});

describe("xp award formulas", () => {
  it("xpForTest has a floor of 5 so a very slow/bad test still earns something", () => {
    expect(xpForTest(0, 0)).toBe(5);
  });

  it("xpForTest scales with wpm and accuracy", () => {
    // wpm/3 + accuracy/10, rounded: 60/3=20 + 90/10=9 -> 29
    expect(xpForTest(60, 90)).toBe(29);
  });

  it("xpForLesson is a flat amount", () => {
    expect(xpForLesson()).toBe(25);
  });

  it("xpForGame has a floor of 5 and scales with score", () => {
    expect(xpForGame(0)).toBe(5);
    expect(xpForGame(800)).toBe(100);
  });

  it("xpForRace pays more for a win than a loss", () => {
    expect(xpForRace(true)).toBeGreaterThan(xpForRace(false));
    expect(xpForRace(true)).toBe(30);
    expect(xpForRace(false)).toBe(12);
  });

  it("xpForChallenge has a floor of 8", () => {
    expect(xpForChallenge(0)).toBe(8);
  });
});

describe("MISSIONS", () => {
  it("has a unique id for every mission", () => {
    const ids = MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every mission has a positive target and xp reward", () => {
    for (const m of MISSIONS) {
      expect(m.target).toBeGreaterThan(0);
      expect(m.xp).toBeGreaterThan(0);
    }
  });

  // These MUST stay in sync with the VALUES table inside claim_mission()
  // in supabase/migrations/0011_security_hardening.sql — the database is
  // the source of truth for what actually gets paid out, this file is
  // only what the UI shows before that. If this test ever fails after
  // changing a mission here, the migration needs the matching update too.
  it("matches the payout table the server trusts", () => {
    const expected: Record<string, { target: number; xp: number }> = {
      m1: { target: 3, xp: 20 },
      m2: { target: 300, xp: 25 },
      m3: { target: 1, xp: 15 },
      m4: { target: 1, xp: 20 },
      m5: { target: 2, xp: 20 },
      m6: { target: 1, xp: 25 },
      m7: { target: 1, xp: 20 },
      m8: { target: 1, xp: 15 },
      m9: { target: 1, xp: 10 }
    };
    for (const m of MISSIONS) {
      expect(expected[m.id], `mission ${m.id} not in expected server table`).toBeDefined();
      expect(m.target).toBe(expected[m.id].target);
      expect(m.xp).toBe(expected[m.id].xp);
    }
  });
});

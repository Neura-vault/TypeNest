import { describe, it, expect } from "vitest";
import { scoreWord, computeWpm, computeAccuracy, computeConsistency, tallyCharStats, mergeCharTally } from "./wpm";

describe("scoreWord", () => {
  it("counts a perfectly typed word as fully correct", () => {
    expect(scoreWord("hello", "hello")).toEqual({ total: 5, correct: 5 });
  });

  it("counts mismatched characters as incorrect but still typed", () => {
    // "hallo" vs "hello": 4/5 characters match (index 1: a vs e).
    expect(scoreWord("hallo", "hello")).toEqual({ total: 5, correct: 4 });
  });

  it("counts extra characters typed past the target's length as typed but not correct", () => {
    expect(scoreWord("helloo", "hello")).toEqual({ total: 6, correct: 5 });
  });

  it("only counts characters actually typed when typed is shorter than target", () => {
    // Matches finalizeWord's original behavior for a mid-word cutoff (e.g.
    // time ran out): only the typed prefix counts toward "total", not the
    // untyped remainder of the target word.
    expect(scoreWord("hel", "hello")).toEqual({ total: 3, correct: 3 });
  });

  it("handles an empty typed string", () => {
    expect(scoreWord("", "hello")).toEqual({ total: 0, correct: 0 });
  });
});

describe("computeWpm", () => {
  it("is the standard 5-characters-per-word convention", () => {
    // 250 correct characters in exactly 1 minute = 50 WPM.
    expect(computeWpm(250, 1)).toBe(50);
  });

  it("returns 0 for zero or negative elapsed time instead of dividing by zero", () => {
    expect(computeWpm(100, 0)).toBe(0);
    expect(computeWpm(100, -1)).toBe(0);
  });

  it("rounds to the nearest whole number", () => {
    expect(computeWpm(251, 1)).toBe(50); // 50.2 -> 50
    expect(computeWpm(255, 1)).toBe(51); // 51.0 -> 51
  });
});

describe("computeAccuracy", () => {
  it("is 100% when nothing has been typed yet", () => {
    expect(computeAccuracy(0, 0)).toBe(100);
  });

  it("computes the correct/total percentage", () => {
    expect(computeAccuracy(90, 100)).toBe(90);
  });

  it("never goes negative even with unusual inputs", () => {
    expect(computeAccuracy(-5, 100)).toBe(0);
  });
});

describe("computeConsistency", () => {
  it("is 100 for perfectly steady typing (no variance)", () => {
    expect(computeConsistency([60, 60, 60, 60])).toBe(100);
  });

  it("is 100 when there's fewer than 2 samples to compare", () => {
    expect(computeConsistency([60])).toBe(100);
    expect(computeConsistency([])).toBe(100);
  });

  it("drops for erratic typing speed", () => {
    const steady = computeConsistency([60, 60, 61, 59, 60]);
    const erratic = computeConsistency([20, 90, 15, 100, 30]);
    expect(erratic).toBeLessThan(steady);
  });

  it("ignores zero readings (test not started yet) rather than treating them as a stall", () => {
    expect(computeConsistency([0, 0, 60, 60])).toBe(100);
  });

  it("stays within the 0-100 range", () => {
    const result = computeConsistency([5, 200, 1, 300, 2]);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe("tallyCharStats", () => {
  it("tallies one attempt per target character typed correctly", () => {
    const tally = tallyCharStats("cat", "cat");
    expect(tally.get("c")).toEqual({ attempts: 1, errors: 0 });
    expect(tally.get("a")).toEqual({ attempts: 1, errors: 0 });
    expect(tally.get("t")).toEqual({ attempts: 1, errors: 0 });
  });

  it("counts an error against the target key, not the mistyped key", () => {
    // Typed "cot" for target "cat": the 'a' key was the one that should
    // have been pressed and wasn't — that's what should show up as weak,
    // not 'o'.
    const tally = tallyCharStats("cot", "cat");
    expect(tally.get("a")).toEqual({ attempts: 1, errors: 1 });
    expect(tally.get("o")).toBeUndefined();
  });

  it("only tallies positions where both typed and target have a character", () => {
    // Typed shorter than target: only the typed prefix is tallied.
    expect(tallyCharStats("ca", "cat").size).toBe(2);
    // Typed longer than target: the extra characters aren't tallied (no target key to blame).
    expect(tallyCharStats("catt", "cat").size).toBe(3);
  });

  it("repeated letters accumulate attempts on the same key", () => {
    const tally = tallyCharStats("ebb", "ebb");
    expect(tally.get("b")).toEqual({ attempts: 2, errors: 0 });
  });
});

describe("mergeCharTally", () => {
  it("combines two tallies, summing attempts and errors per key", () => {
    const a = tallyCharStats("cot", "cat"); // a: 1 attempt, 1 error
    const b = tallyCharStats("cat", "cat"); // a: 1 attempt, 0 errors
    const merged = mergeCharTally(new Map(), a);
    mergeCharTally(merged, b);
    expect(merged.get("a")).toEqual({ attempts: 2, errors: 1 });
  });

  it("mutates and returns the same map passed as `into`", () => {
    const into = new Map();
    const result = mergeCharTally(into, tallyCharStats("hi", "hi"));
    expect(result).toBe(into);
  });
});

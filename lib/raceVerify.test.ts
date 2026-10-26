import { describe, expect, it } from "vitest";
import { verifyKeystrokes } from "./raceVerify";

// Human-ish log: uneven gaps between 90 and 190 ms.
const human = (n: number) => {
  let t = 0;
  return Array.from({ length: n }, (_, i) => (t += 90 + ((i * 37) % 100)));
};

describe("verifyKeystrokes", () => {
  it("accepts a natural-looking log that matches the race clock", () => {
    const keys = human(200);
    const r = verifyKeystrokes(keys, 200, keys[keys.length - 1] + 300);
    expect(r.ok).toBe(true);
  });
  it("rejects an incomplete log", () => {
    expect(verifyKeystrokes(human(50), 200, 8000).ok).toBe(false);
  });
  it("rejects timing that does not match the race clock", () => {
    const keys = human(200);
    expect(verifyKeystrokes(keys, 200, keys[keys.length - 1] + 60_000).ok).toBe(false);
  });
  it("rejects bursts faster than a person can type", () => {
    const keys = Array.from({ length: 200 }, (_, i) => i * 5);
    expect(verifyKeystrokes(keys, 200, 1000).ok).toBe(false);
  });
  it("rejects perfectly even bot timing", () => {
    const keys = Array.from({ length: 200 }, (_, i) => (i + 1) * 100);
    expect(verifyKeystrokes(keys, 200, 20_000).ok).toBe(false);
  });
  it("rejects an out-of-order log", () => {
    const keys = human(200);
    keys[100] = 0;
    expect(verifyKeystrokes(keys, 200, keys[keys.length - 1]).ok).toBe(false);
  });
});

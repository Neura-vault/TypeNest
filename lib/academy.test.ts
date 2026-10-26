import { describe, expect, it } from "vitest";
import { LESSONS, LESSON_CHAIN } from "./academy";

describe("academy lessons", () => {
  it("has unique ids and every chain entry is a real lesson", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(LESSON_CHAIN).toEqual(ids);
  });
  it("gives every lesson enough words to type", () => {
    for (const l of LESSONS) {
      expect(l.words.length).toBeGreaterThanOrEqual(20);
      expect(l.words.every((w) => w.trim() === w && w.length > 0)).toBe(true);
    }
  });
});

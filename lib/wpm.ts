// Pure, side-effect-free scoring functions used by TypingEngine. Pulled out
// on their own specifically so they can be unit tested without mounting the
// whole component — this is the actual "did the test score correctly"
// logic, so it's the highest-value thing in the app to have tests around.

export interface CharScore {
  total: number;
  correct: number;
}

/** Character-by-character comparison of what was typed against the target word. */
export function scoreWord(typed: string, target: string): CharScore {
  const len = Math.max(typed.length, target.length);
  let correct = 0;
  let total = 0;
  for (let i = 0; i < len; i++) {
    if (i < typed.length) total++;
    if (i < target.length && i < typed.length && target[i] === typed[i]) correct++;
  }
  return { total, correct };
}

/** Standard "5 characters = 1 word" WPM convention (Monkeytype and most typing sites use this). */
export function computeWpm(correctChars: number, elapsedMinutes: number): number {
  if (elapsedMinutes <= 0) return 0;
  return Math.round(correctChars / 5 / elapsedMinutes);
}

export interface CharTally {
  attempts: number;
  errors: number;
}

/**
 * Per-character attempt/error tally for one word, keyed by the *target*
 * character (the key the person was supposed to press) — this is what
 * powers the "weak keys" feature on the Train page. Only counts positions
 * where a real comparison happened (both typed and target have a
 * character there); extra characters typed past the target's length
 * don't have a "correct key" to blame, so they're left out.
 */
export function tallyCharStats(typed: string, target: string): Map<string, CharTally> {
  const tally = new Map<string, CharTally>();
  const len = Math.min(typed.length, target.length);
  for (let i = 0; i < len; i++) {
    const key = target[i];
    const entry = tally.get(key) ?? { attempts: 0, errors: 0 };
    entry.attempts++;
    if (typed[i] !== key) entry.errors++;
    tally.set(key, entry);
  }
  return tally;
}

/** Merges a word's tally into a running total, mutating and returning `into`. */
export function mergeCharTally(into: Map<string, CharTally>, from: Map<string, CharTally>): Map<string, CharTally> {
  for (const [key, val] of from) {
    const entry = into.get(key) ?? { attempts: 0, errors: 0 };
    entry.attempts += val.attempts;
    entry.errors += val.errors;
    into.set(key, entry);
  }
  return into;
}

export function computeAccuracy(correctChars: number, totalChars: number): number {
  if (totalChars === 0) return 100;
  return Math.max(0, Math.round((correctChars / totalChars) * 100));
}

/** Lower coefficient of variation across sampled WPM readings = steadier typing = higher score. */
export function computeConsistency(wpmHistory: number[]): number {
  const h = wpmHistory.filter((v) => v > 0);
  if (h.length < 2) return 100;
  const mean = h.reduce((a, b) => a + b, 0) / h.length;
  if (mean === 0) return 100;
  const variance = h.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / h.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
}

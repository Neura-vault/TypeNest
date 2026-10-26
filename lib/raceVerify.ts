/**
 * Checks the keystroke log a player sends when they finish a race.
 * `keys` holds the time (ms since the race started) of every accepted key.
 * This cannot prove a human typed it, but it rejects the easy cheats:
 * invented results, pasted text, and perfectly even bot timing.
 */
export function verifyKeystrokes(
  keys: number[],
  chars: number,
  elapsedMs: number
): { ok: true; wpm: number } | { ok: false; reason: string } {
  if (keys.length < chars) return { ok: false, reason: "Keystroke log is incomplete." };
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] < keys[i - 1]) return { ok: false, reason: "Keystroke log is out of order." };
  }
  const last = keys[keys.length - 1];
  if (last > elapsedMs + 2000 || last < elapsedMs - 6000) {
    return { ok: false, reason: "Keystroke timing does not match the race clock." };
  }
  const gaps = keys.slice(1).map((k, i) => k - keys[i]);
  const tooFast = gaps.filter((g) => g < 20).length / Math.max(gaps.length, 1);
  if (tooFast > 0.2) return { ok: false, reason: "Typing speed looks automated." };
  if (gaps.length >= 40) {
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
    if (sd < 10) return { ok: false, reason: "Typing rhythm looks automated." };
  }
  return { ok: true, wpm: chars / 5 / (Math.max(last, 1) / 60000) };
}

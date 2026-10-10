export interface CharStatRow {
  char: string;
  attempts: number;
  errors: number;
}

export interface WeakKey {
  char: string;
  rate: number;
  attempts: number;
}

export function computeWeakKeys(
  charStats: CharStatRow[],
  threshold = 0.12,
  limit = 5
): WeakKey[] {
  return charStats
    .map((c) => ({ char: c.char, rate: c.errors / c.attempts, attempts: c.attempts }))
    .filter((c) => c.rate > threshold)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit);
}

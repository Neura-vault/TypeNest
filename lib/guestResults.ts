// Guest results (someone typing without an account) used to just vanish —
// the test would show on screen once and then be gone. Keeping them in
// localStorage and replaying them into /api/tests right after signup means
// a guest who tries the product, likes it, and signs up doesn't lose the
// progress that convinced them to sign up in the first place.

const STORAGE_KEY = "typenest-guest-results";
const MAX_STORED = 20;

export interface GuestTestPayload {
  testType: "time" | "words";
  contentType?: string;
  language?: string;
  durationSec?: number | null;
  wordCount?: number | null;
  wpm: number;
  rawWpm?: number;
  accuracy: number;
  consistency?: number | null;
  errors?: number;
  backspaces?: number;
  charactersTyped?: number;
  charStats?: Record<string, { attempts: number; errors: number }>;
  punctuation?: boolean;
  numbers?: boolean;
}

export function saveGuestResult(result: GuestTestPayload): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readGuestResults();
    const next = [...existing, result].slice(-MAX_STORED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage full/unavailable (private browsing, etc.) — the result
    // just won't persist across a signup in that case, no crash either way.
  }
}

export function readGuestResults(): GuestTestPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearGuestResults(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

/** Called right after a successful signup/login to move guest results onto the new account. */
export async function migrateGuestResults(): Promise<void> {
  const results = readGuestResults();
  if (results.length === 0) return;

  for (const result of results) {
    try {
      await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result)
      });
    } catch {
      // If one fails to save, keep going with the rest rather than losing
      // all of them — better to save 9 of 10 than none.
    }
  }
  clearGuestResults();
}

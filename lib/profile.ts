export interface SocialLinks {
  twitter?: string;
  github?: string;
  instagram?: string;
  website?: string;
}

export const SOCIAL_LINK_KEYS: (keyof SocialLinks)[] = ["twitter", "github", "instagram", "website"];

// Countries kept as a short, real list rather than a giant generated one —
// easy to extend later without needing a separate lookup table.
export const COUNTRIES = [
  "Pakistan","India","United States","United Kingdom","Canada","Australia","Germany","France",
  "United Arab Emirates","Saudi Arabia","Bangladesh","Turkey","Indonesia","Brazil","Nigeria",
  "Egypt","China","Japan","South Korea","Other"
];

export function sanitizeSocialLinks(input: unknown): SocialLinks {
  if (typeof input !== "object" || input === null) return {};
  const out: SocialLinks = {};
  const obj = input as Record<string, unknown>;
  for (const key of SOCIAL_LINK_KEYS) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0 && value.length <= 100) {
      out[key] = value.trim();
    }
  }
  return out;
}

// Names nobody should be able to register/rename into — they'd otherwise
// impersonate the platform itself or common support/admin roles. Not a
// full profanity filter (that needs a proper wordlist + locale handling),
// but closes the obvious "become @admin" gap.
const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "support", "typenest", "moderator", "mod", "staff",
  "help", "official", "root", "system", "typenest_official", "typenest_support",
  "null", "undefined", "api", "www", "me", "owner"
]);

export function isValidUsername(username: string): boolean {
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) return false;
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return false;
  return true;
}

export function isValidCountry(country: string): boolean {
  return COUNTRIES.includes(country);
}

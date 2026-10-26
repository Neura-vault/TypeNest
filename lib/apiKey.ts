import { createHash, randomBytes } from "crypto";

export const KEY_PREFIX = "tn_";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** A new key: "tn_" plus 256 random bits. Only the hash is ever stored. */
export function generateApiKey() {
  const key = KEY_PREFIX + randomBytes(32).toString("base64url");
  return { key, prefix: key.slice(0, 10), hash: hashApiKey(key) };
}

export function isApiKeyShape(value: string): boolean {
  return /^tn_[A-Za-z0-9_-]{43}$/.test(value);
}

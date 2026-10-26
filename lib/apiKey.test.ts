import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, isApiKeyShape } from "./apiKey";

describe("api keys", () => {
  it("generates well-formed, unique keys", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(isApiKeyShape(a.key)).toBe(true);
    expect(a.key).not.toBe(b.key);
    expect(a.prefix).toBe(a.key.slice(0, 10));
  });
  it("hashes deterministically and never stores the key itself", () => {
    const k = generateApiKey();
    expect(hashApiKey(k.key)).toBe(k.hash);
    expect(k.hash).toHaveLength(64);
    expect(k.hash).not.toContain(k.key);
  });
  it("rejects malformed keys", () => {
    expect(isApiKeyShape("")).toBe(false);
    expect(isApiKeyShape("tn_short")).toBe(false);
    expect(isApiKeyShape("sk_" + "a".repeat(43))).toBe(false);
  });
});

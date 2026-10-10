import { describe, it, expect } from "vitest";
import { isValidUsername, isValidCountry, sanitizeSocialLinks, COUNTRIES } from "./profile";

describe("isValidUsername", () => {
  it("accepts a normal username", () => {
    expect(isValidUsername("ShadowTypist")).toBe(true);
    expect(isValidUsername("speed_demon-99")).toBe(true);
  });

  it("rejects usernames shorter than 3 or longer than 20 characters", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(21))).toBe(false);
  });

  it("rejects characters outside letters/numbers/underscore/hyphen", () => {
    expect(isValidUsername("bad name")).toBe(false);
    expect(isValidUsername("bad@name")).toBe(false);
    expect(isValidUsername("bad.name")).toBe(false);
  });

  it("rejects reserved names, case-insensitively", () => {
    expect(isValidUsername("admin")).toBe(false);
    expect(isValidUsername("Admin")).toBe(false);
    expect(isValidUsername("ADMIN")).toBe(false);
    expect(isValidUsername("support")).toBe(false);
    expect(isValidUsername("typenest_official")).toBe(false);
  });

  it("allows a username that merely contains a reserved word as a substring", () => {
    // Only an exact match is blocked — "adminX" is a real, distinct name.
    expect(isValidUsername("adminX")).toBe(true);
  });
});

describe("isValidCountry", () => {
  it("accepts anything in the known list", () => {
    expect(isValidCountry("Pakistan")).toBe(true);
    expect(isValidCountry("Other")).toBe(true);
  });

  it("rejects a country not in the list (e.g. junk input)", () => {
    expect(isValidCountry("Not A Real Country")).toBe(false);
    expect(isValidCountry("")).toBe(false);
  });

  it("is case-sensitive to the exact stored list (matches the dropdown, not free text)", () => {
    expect(isValidCountry("pakistan")).toBe(false);
  });

  it("the country list itself has no duplicates", () => {
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
  });
});

describe("sanitizeSocialLinks", () => {
  it("keeps only known keys with non-empty string values", () => {
    expect(sanitizeSocialLinks({ twitter: "shadowtypist", randomKey: "ignored" })).toEqual({
      twitter: "shadowtypist"
    });
  });

  it("trims whitespace", () => {
    expect(sanitizeSocialLinks({ github: "  someone  " })).toEqual({ github: "someone" });
  });

  it("drops empty or whitespace-only values", () => {
    expect(sanitizeSocialLinks({ website: "   " })).toEqual({});
  });

  it("drops values longer than 100 characters", () => {
    expect(sanitizeSocialLinks({ website: "a".repeat(101) })).toEqual({});
  });

  it("returns an empty object for non-object input", () => {
    expect(sanitizeSocialLinks(null)).toEqual({});
    expect(sanitizeSocialLinks("not an object")).toEqual({});
    expect(sanitizeSocialLinks(undefined)).toEqual({});
  });
});

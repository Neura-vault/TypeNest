import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safeRedirect";

describe("safeNextPath", () => {
  it("keeps normal in-site paths", () => {
    expect(safeNextPath("/profile")).toBe("/profile");
    expect(safeNextPath("/compete/multiplayer/ABC123?x=1")).toBe("/compete/multiplayer/ABC123?x=1");
  });
  it("falls back to home for missing values", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
  it("blocks external and protocol-relative targets", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("evil.com")).toBe("/");
    expect(safeNextPath("/ok\nSet-Cookie: x=1")).toBe("/");
  });
});

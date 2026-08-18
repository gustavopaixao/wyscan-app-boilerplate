import { describe, expect, it } from "vitest";
import { safeNext } from "../useAuth";

/**
 * `next` is an attacker-controlled query parameter that becomes a redirect
 * target after sign-in, so every shape that a browser would resolve to another
 * origin has to be rejected.
 */
describe("safeNext", () => {
  it("keeps a same-origin path", () => {
    expect(safeNext("/settings")).toBe("/settings");
    expect(safeNext("/a/b?c=d")).toBe("/a/b?c=d");
  });

  it("falls back to the root when absent", () => {
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
  });

  it("rejects a protocol-relative URL", () => {
    // The one a naive startsWith("/") check lets through.
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("//evil.com/path")).toBe("/");
  });

  it("rejects an absolute URL", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });

  it("rejects a backslash smuggled past the slash check", () => {
    // Some browsers normalise `\` to `/`, making this protocol-relative.
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("/\\/evil.com")).toBe("/");
  });

  it("rejects a scheme hidden after a leading slash", () => {
    expect(safeNext("/https://evil.com")).toBe("/");
  });
});

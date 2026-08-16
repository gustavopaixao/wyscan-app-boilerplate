import { describe, expect, it } from "vitest";
import {
  compareSemver,
  isValidSemver,
  isVersionBelow,
  parseSemver,
} from "./semver.js";

describe("parseSemver", () => {
  it("parses full major.minor.patch", () => {
    expect(parseSemver("1.4.2")).toEqual({
      major: 1,
      minor: 4,
      patch: 2,
      prerelease: [],
    });
  });

  it("treats a missing minor/patch as 0", () => {
    expect(parseSemver("2")).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
      prerelease: [],
    });
    expect(parseSemver("2.5")).toEqual({
      major: 2,
      minor: 5,
      patch: 0,
      prerelease: [],
    });
  });

  it("parses a pre-release suffix", () => {
    expect(parseSemver("1.0.0-beta.1")).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: ["beta", "1"],
    });
  });

  it("ignores build metadata", () => {
    expect(parseSemver("1.2.3+build.99")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: [],
    });
  });

  it("returns null for malformed input", () => {
    expect(parseSemver("")).toBeNull();
    expect(parseSemver("abc")).toBeNull();
    expect(parseSemver("1.x.0")).toBeNull();
    expect(parseSemver("1.0.0-")).toBeNull();
    expect(parseSemver(null)).toBeNull();
    expect(parseSemver(undefined)).toBeNull();
    expect(parseSemver(42)).toBeNull();
  });
});

describe("isValidSemver", () => {
  it("accepts valid, rejects invalid", () => {
    expect(isValidSemver("1.6.0")).toBe(true);
    expect(isValidSemver("1")).toBe(true);
    expect(isValidSemver("not-a-version")).toBe(false);
    expect(isValidSemver("")).toBe(false);
  });
});

describe("compareSemver", () => {
  it("orders by major, minor, patch", () => {
    expect(compareSemver("1.0.0", "2.0.0")).toBe(-1);
    expect(compareSemver("1.5.0", "1.4.0")).toBe(1);
    expect(compareSemver("1.4.3", "1.4.2")).toBe(1);
    expect(compareSemver("1.4.2", "1.4.2")).toBe(0);
  });

  it("treats missing patch as equal to explicit .0", () => {
    expect(compareSemver("1.4", "1.4.0")).toBe(0);
  });

  it("ranks a pre-release below its release", () => {
    expect(compareSemver("1.0.0-beta", "1.0.0")).toBe(-1);
    expect(compareSemver("1.0.0", "1.0.0-beta")).toBe(1);
    expect(compareSemver("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
    expect(compareSemver("1.0.0-beta.2", "1.0.0-beta.10")).toBe(-1);
  });

  it("returns 0 (fail-safe) for malformed input", () => {
    expect(compareSemver("garbage", "1.0.0")).toBe(0);
    expect(compareSemver("1.0.0", "garbage")).toBe(0);
  });
});

describe("isVersionBelow", () => {
  it("is true only when strictly below", () => {
    expect(isVersionBelow("1.3.0", "1.4.0")).toBe(true);
    expect(isVersionBelow("1.4.0", "1.4.0")).toBe(false);
    expect(isVersionBelow("1.5.0", "1.4.0")).toBe(false);
  });

  it("fails safe (not below) on malformed input", () => {
    expect(isVersionBelow("garbage", "1.4.0")).toBe(false);
    expect(isVersionBelow("1.4.0", "garbage")).toBe(false);
    expect(isVersionBelow(undefined, "1.4.0")).toBe(false);
    expect(isVersionBelow("", "1.4.0")).toBe(false);
  });
});

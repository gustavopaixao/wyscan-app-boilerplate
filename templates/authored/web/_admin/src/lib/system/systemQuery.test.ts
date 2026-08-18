import { describe, expect, it } from "vitest";
import { formatUptime, hasDegradedInfra, statusTone } from "./systemQuery";

describe("formatUptime", () => {
  it("scales the unit to the magnitude", () => {
    expect(formatUptime(45)).toBe("45s");
    expect(formatUptime(600)).toBe("10m");
    expect(formatUptime(8_040)).toBe("2h 14m");
    expect(formatUptime(273_600)).toBe("3d 4h");
  });

  it("falls back rather than printing NaN", () => {
    expect(formatUptime(Number.NaN)).toBe("—");
    expect(formatUptime(-1)).toBe("—");
  });
});

describe("statusTone", () => {
  it("does not paint an unconfigured service as broken", () => {
    // A fresh project with no Redis is expected, and colouring it red teaches
    // operators to ignore the page.
    expect(statusTone("skipped")).toBe("muted");
    expect(statusTone("ok")).toBe("ok");
    expect(statusTone("down")).toBe("bad");
  });
});

describe("hasDegradedInfra", () => {
  it("warns only about something that is actually down", () => {
    expect(hasDegradedInfra([{ key: "redis", status: "skipped" }])).toBe(false);
    expect(hasDegradedInfra([{ key: "mongodb", status: "ok" }])).toBe(false);
    expect(hasDegradedInfra([{ key: "mongodb", status: "down" }])).toBe(true);
  });
});

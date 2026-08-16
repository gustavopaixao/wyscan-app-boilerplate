import { describe, expect, it } from "vitest";
import {
  isoDateTimeSchema,
  parseOptionalIsoDateTime,
  predictionLocked,
} from "./datetime.js";

describe("datetime", () => {
  describe("predictionLocked", () => {
    const lockTime = new Date("2026-06-15T20:00:00.000Z");

    it("returns false before lock", () => {
      expect(predictionLocked(lockTime, null, lockTime.getTime() - 1)).toBe(
        false,
      );
    });

    it("returns true at exact lock instant", () => {
      expect(predictionLocked(lockTime, null, lockTime.getTime())).toBe(true);
    });

    it("returns true when processedAt is set even if lock is in future", () => {
      const processedAt = new Date("2026-06-14T12:00:00.000Z");
      expect(
        predictionLocked(lockTime, processedAt, lockTime.getTime() - 1),
      ).toBe(true);
    });
  });

  describe("parseOptionalIsoDateTime", () => {
    it("returns null for null", () => {
      expect(parseOptionalIsoDateTime(null)).toBeNull();
    });

    it("returns undefined for undefined", () => {
      expect(parseOptionalIsoDateTime(undefined)).toBeUndefined();
    });

    it("parses ISO string", () => {
      const d = parseOptionalIsoDateTime("2026-06-15T20:00:00.000Z");
      expect(d).toBeInstanceOf(Date);
      expect(d?.toISOString()).toBe("2026-06-15T20:00:00.000Z");
    });
  });

  describe("isoDateTimeSchema", () => {
    it("rejects invalid datetime", () => {
      const r = isoDateTimeSchema.safeParse("not-a-date");
      expect(r.success).toBe(false);
    });

    it("accepts valid ISO", () => {
      const r = isoDateTimeSchema.safeParse("2026-06-15T20:00:00.000Z");
      expect(r.success).toBe(true);
    });
  });
});

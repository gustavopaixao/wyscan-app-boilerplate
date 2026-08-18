import { describe, expect, it } from "vitest";
import { isAppAdminRole } from "./admin-access";

describe("isAppAdminRole", () => {
  it("accepts admin", () => {
    expect(isAppAdminRole("admin")).toBe(true);
  });

  // Moderators have privileges on the API but are NOT admin-console users.
  // If this ever flips, it must be a deliberate edit here, not a drift.
  it("rejects moderator", () => {
    expect(isAppAdminRole("moderator")).toBe(false);
  });

  it("rejects everything else", () => {
    for (const value of [
      "user",
      "",
      null,
      undefined,
      0,
      {},
      ["admin"],
      "ADMIN",
    ]) {
      expect(isAppAdminRole(value), String(value)).toBe(false);
    }
  });
});

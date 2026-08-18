import { describe, expect, it } from "vitest";
import { groupHasActiveItem, linkIsActive, navGroups } from "./navItems";

describe("linkIsActive", () => {
  it("matches a route and its children", () => {
    expect(linkIsActive("/users", "/users")).toBe(true);
    expect(linkIsActive("/users/42", "/users")).toBe(true);
  });

  // Without the `/` special case the dashboard would be active everywhere.
  it("never treats the dashboard as a prefix", () => {
    expect(linkIsActive("/", "/")).toBe(true);
    expect(linkIsActive("/users", "/")).toBe(false);
  });

  // The whole point of the `exact` flag: a parent must not light up alongside
  // its own child route.
  it("honours the exact flag for a section index", () => {
    expect(linkIsActive("/settings", "/settings", true)).toBe(true);
    expect(linkIsActive("/settings/billing", "/settings", true)).toBe(false);
    expect(linkIsActive("/settings/billing", "/settings", false)).toBe(true);
  });

  it("does not match a sibling that merely shares a prefix", () => {
    expect(linkIsActive("/users-archive", "/users")).toBe(false);
  });
});

describe("groupHasActiveItem", () => {
  const management = navGroups.find((g) => g.id === "management");

  it("detects an active child so a collapsed group can mark itself", () => {
    expect(management && groupHasActiveItem(management, "/users/42")).toBe(
      true,
    );
  });

  it("is false when nothing in the group matches", () => {
    expect(management && groupHasActiveItem(management, "/logs")).toBe(false);
  });
});

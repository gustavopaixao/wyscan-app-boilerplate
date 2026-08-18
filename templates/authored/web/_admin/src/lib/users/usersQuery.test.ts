import { describe, expect, it } from "vitest";
import {
  buildUsersQuery,
  EMPTY_USERS_FILTER,
  formatJoined,
  USERS_PAGE_SIZE,
  withFilter,
} from "./usersQuery";

/**
 * These pin the contract with `api/src/v1/adminUsersRoutes.ts`. If the two ever
 * disagree about a parameter name, this is where it shows up rather than in an
 * empty table nobody can explain.
 */
describe("buildUsersQuery", () => {
  it("always sends a page and a limit", () => {
    expect(buildUsersQuery(EMPTY_USERS_FILTER)).toBe(
      `page=1&limit=${USERS_PAGE_SIZE}`,
    );
  });

  it("stays inside the page size the API will accept", () => {
    expect(USERS_PAGE_SIZE).toBeLessThanOrEqual(100);
  });

  it("omits empty filters rather than sending them blank", () => {
    const query = buildUsersQuery({ ...EMPTY_USERS_FILTER, search: "   " });
    expect(query).not.toContain("search");
    expect(query).not.toContain("role");
    expect(query).not.toContain("status");
  });

  it("sends the filters that are set", () => {
    const query = buildUsersQuery({
      page: 3,
      search: " ana ",
      role: "admin",
      status: "active",
    });
    const params = new URLSearchParams(query);
    expect(params.get("page")).toBe("3");
    expect(params.get("search")).toBe("ana");
    expect(params.get("role")).toBe("admin");
    expect(params.get("status")).toBe("active");
  });

  it("never sends a page below 1", () => {
    expect(
      new URLSearchParams(
        buildUsersQuery({ ...EMPTY_USERS_FILTER, page: 0 }),
      ).get("page"),
    ).toBe("1");
  });
});

describe("withFilter", () => {
  it("returns to the first page whenever the filter changes", () => {
    // Narrowing while on page 7 would otherwise land on an empty table that
    // looks like "no users" rather than "no page 7".
    const current = { ...EMPTY_USERS_FILTER, page: 7 };
    expect(withFilter(current, { role: "admin" })).toEqual({
      page: 1,
      search: "",
      role: "admin",
      status: "",
    });
  });
});

describe("formatJoined", () => {
  it("renders an ISO date", () => {
    expect(formatJoined("2026-03-12T10:00:00.000Z")).toBe("12 Mar 2026");
  });

  it("falls back to a dash rather than showing Invalid Date", () => {
    expect(formatJoined(null)).toBe("—");
    expect(formatJoined("not a date")).toBe("—");
  });
});

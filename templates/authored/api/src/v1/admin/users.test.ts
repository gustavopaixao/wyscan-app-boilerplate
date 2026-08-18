import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
  buildUserFilter,
  escapeRegex,
  parseUserListQuery,
  registerAdminUserRoutes,
} from "./users.js";

/**
 * Parsing and routing only — never database behaviour. Everything asserted here
 * runs before the handler reaches Mongo, so the suite needs no connection.
 */
describe("parseUserListQuery", () => {
  const parse = (qs: string) => parseUserListQuery(new URLSearchParams(qs));

  it("defaults to the first page", () => {
    expect(parse("")).toEqual({
      page: 1,
      limit: 20,
      search: "",
      role: null,
      status: null,
    });
  });

  it("clamps the page to at least 1", () => {
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=-4").page).toBe(1);
    expect(parse("page=banana").page).toBe(1);
  });

  it("caps the page size, so one request cannot ask for the whole table", () => {
    expect(parse("limit=5000").limit).toBe(100);
    expect(parse("limit=0").limit).toBe(1);
    expect(parse("limit=50").limit).toBe(50);
  });

  it("keeps known roles and statuses and drops everything else", () => {
    expect(parse("role=admin").role).toBe("admin");
    expect(parse("status=pending").status).toBe("pending");
    // A stale bookmark should show the unfiltered list, not an error.
    expect(parse("role=superuser").role).toBeNull();
    expect(parse("status=asleep").status).toBeNull();
  });

  it("trims the search term", () => {
    expect(parse("search=%20%20ana%20%20").search).toBe("ana");
  });
});

describe("escapeRegex", () => {
  it("neutralises the metacharacters that would scan the whole collection", () => {
    expect(escapeRegex(".*")).toBe("\\.\\*");
    expect(escapeRegex("a+b")).toBe("a\\+b");
  });

  it("survives an unbalanced paren, which would otherwise throw in the driver", () => {
    expect(() => new RegExp(escapeRegex("("))).not.toThrow();
  });

  it("leaves an ordinary term alone", () => {
    expect(escapeRegex("ana@example.com")).toBe("ana@example\\.com");
  });
});

describe("buildUserFilter", () => {
  const query = {
    page: 1,
    limit: 20,
    search: "",
    role: null,
    status: null,
  };

  it("is empty when nothing is filtered", () => {
    expect(buildUserFilter(query)).toEqual({});
  });

  it("searches email and display name together", () => {
    const filter = buildUserFilter({ ...query, search: "ana" });
    expect(filter.$or).toEqual([
      { email: { $regex: "ana", $options: "i" } },
      { displayName: { $regex: "ana", $options: "i" } },
    ]);
  });

  it("combines role and status", () => {
    expect(
      buildUserFilter({ ...query, role: "admin", status: "active" }),
    ).toEqual({ role: "admin", status: "active" });
  });
});

describe("registerAdminUserRoutes", () => {
  const app = new Hono();
  registerAdminUserRoutes(app);

  it("binds the route", async () => {
    const res = await app.request("/api/v1/admin/users");
    expect(res.status).not.toBe(404);
  });

  it("refuses an anonymous caller before touching the database", async () => {
    const res = await app.request("/api/v1/admin/users");
    expect(res.status).toBe(401);
  });

  it("is read-only", async () => {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const res = await app.request("/api/v1/admin/users", { method });
      expect(res.status, `${method} /api/v1/admin/users`).toBe(404);
    }
  });
});

/**
 * The bug this pins actually shipped: `@hono/node-server` installs its own
 * `Response` global, so the `NextResponse` the auth package refuses with is not
 * an instance of the ambient `Response`. A route guarding with
 * `instanceof Response` therefore served the whole user directory to anonymous
 * callers — while passing every unit test, because under Vitest the two classes
 * are the same object.
 *
 * So the refusal is faked here as an object from a FOREIGN class: it is
 * Response-shaped but fails `instanceof Response`, exactly as it does in
 * production.
 */
describe("the admin guard fails closed", () => {
  class ForeignResponse {
    readonly status = 401;
    text() {
      return Promise.resolve('{"message":"Not signed in."}');
    }
  }

  it("refuses a caller the guard rejected, even from another Response realm", async () => {
    const foreign = new ForeignResponse();
    expect(foreign instanceof Response).toBe(false); // the whole point

    vi.resetModules();
    vi.doMock("../routeHelpers.js", async () => {
      const actual =
        await vi.importActual<typeof import("../routeHelpers.js")>(
          "../routeHelpers.js",
        );
      return {
        ...actual,
        requireAdminUser: vi.fn().mockResolvedValue(foreign),
      };
    });

    const { registerAdminUserRoutes: register } = await import("./users.js");
    const app = new Hono();
    register(app);

    const res = await app.request("/api/v1/admin/users");
    expect(res.status).toBe(401);
    await expect(res.text()).resolves.not.toContain("users");

    vi.doUnmock("../routeHelpers.js");
    vi.resetModules();
  });
});

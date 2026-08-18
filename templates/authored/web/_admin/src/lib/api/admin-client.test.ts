import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminApiError, adminFetch } from "./admin-client";

const handleUnauthorized = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/handle-unauthorized", () => ({ handleUnauthorized }));

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  handleUnauthorized.mockClear();
});

describe("adminFetch", () => {
  it("calls the BFF, not the API, and sends the session cookies", async () => {
    const fetchMock = mockFetch(200, { users: [] });
    await adminFetch("/admin/users?page=1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/users?page=1",
      // Without same-origin credentials the cookies are dropped and every
      // request comes back 401.
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("returns the parsed body", async () => {
    mockFetch(200, { users: [{ id: "1" }], total: 1 });
    await expect(adminFetch("/admin/users")).resolves.toEqual({
      users: [{ id: "1" }],
      total: 1,
    });
  });

  it("signs out on a 401", async () => {
    mockFetch(401, { message: "Not signed in." });
    await expect(adminFetch("/admin/users")).rejects.toBeInstanceOf(
      AdminApiError,
    );
    expect(handleUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("signs out on a 403 too — a revoked role is a dead session here", async () => {
    mockFetch(403, { message: "Admin access required." });
    await expect(adminFetch("/admin/users")).rejects.toBeInstanceOf(
      AdminApiError,
    );
    expect(handleUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("surfaces the server message on other failures without signing out", async () => {
    mockFetch(500, { message: "Boom." });
    await expect(adminFetch("/admin/users")).rejects.toThrow("Boom.");
    expect(handleUnauthorized).not.toHaveBeenCalled();
  });

  it("reports an unreachable server as status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));
    await expect(adminFetch("/admin/users")).rejects.toMatchObject({
      status: 0,
    });
  });

  it("lets an abort through, so a cancelled query is not reported as an error", async () => {
    const abort = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));
    await expect(adminFetch("/admin/users")).rejects.toBe(abort);
    expect(handleUnauthorized).not.toHaveBeenCalled();
  });
});

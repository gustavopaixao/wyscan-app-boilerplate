import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { AUTH_ROUTE_SEGMENTS, registerV1AuthRoutes } from "./authRoutes.js";

/**
 * These assert the ROUTING, not the auth logic — the handlers live in
 * __NPM_SCOPE__/auth-api and are tested there. What can break here is a URL
 * typo or a method mismatch, which no other test would catch.
 */
describe("registerV1AuthRoutes", () => {
  const app = new Hono();
  registerV1AuthRoutes(app);

  it("registers every auth endpoint on POST", async () => {
    for (const segment of AUTH_ROUTE_SEGMENTS) {
      const res = await app.request(`/api/v1/auth/${segment}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      // Anything but 404 proves the route is bound. The handler itself will
      // reject the empty body — that is the package's business, not ours.
      expect(res.status, `POST /api/v1/auth/${segment}`).not.toBe(404);
    }
  });

  it("covers the full documented surface", () => {
    expect(new Set(AUTH_ROUTE_SEGMENTS)).toEqual(
      new Set([
        "register",
        "login",
        "logout",
        "refresh",
        "verify-email",
        "resend-code",
        "forgot-password",
        "reset-password",
        "google",
        "apple",
        "facebook",
      ]),
    );
  });

  it("exposes /api/v1/me on GET, PATCH and DELETE", async () => {
    for (const method of ["GET", "PATCH", "DELETE"]) {
      const res = await app.request("/api/v1/me", { method });
      expect(res.status, `${method} /api/v1/me`).not.toBe(404);
    }
  });

  it("does not answer GET on an auth endpoint", async () => {
    const res = await app.request("/api/v1/auth/login", { method: "GET" });
    expect(res.status).toBe(404);
  });
});

import { describe, expect, it } from "vitest";
import { authBucketFor } from "./authRateLimit.js";

describe("authBucketFor", () => {
  it("matches every auth endpoint", () => {
    expect(authBucketFor("/api/v1/auth/login")).toBe("login");
    expect(authBucketFor("/api/v1/auth/forgot-password")).toBe(
      "forgot-password",
    );
    expect(authBucketFor("/api/v1/auth/resend-code")).toBe("resend-code");
  });

  it("tolerates a trailing slash", () => {
    expect(authBucketFor("/api/v1/auth/login/")).toBe("login");
  });

  it("ignores anything outside the auth namespace", () => {
    expect(authBucketFor("/api/v1/me")).toBeNull();
    expect(authBucketFor("/api/v1/health")).toBeNull();
    expect(authBucketFor("/api/health")).toBeNull();
  });

  // A nested path must not collapse onto its parent's bucket, or a future
  // /auth/login/callback would silently consume the login budget.
  it("does not match nested paths", () => {
    expect(authBucketFor("/api/v1/auth/login/callback")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { getRateLimitClientKey, getTrustedClientIp } from "./clientIp.js";

describe("getTrustedClientIp", () => {
  it("prefers X-Real-IP when TRUST_PROXY is enabled", () => {
    const prev = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = "true";
    const request = new Request("http://localhost/api/v1/test", {
      headers: {
        "x-real-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.99",
      },
    });
    expect(getTrustedClientIp(request)).toBe("203.0.113.10");
    process.env.TRUST_PROXY = prev;
  });

  it("uses first X-Forwarded-For hop when proxy trust is off", () => {
    const prev = process.env.TRUST_PROXY;
    delete process.env.TRUST_PROXY;
    const request = new Request("http://localhost/api/v1/test", {
      headers: {
        "x-real-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.99, 10.0.0.1",
      },
    });
    expect(getTrustedClientIp(request)).toBe("198.51.100.99");
    process.env.TRUST_PROXY = prev;
  });
});

describe("getRateLimitClientKey", () => {
  it("prefixes the client ip", () => {
    const request = new Request("http://localhost/api/v1/test", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });
    expect(getRateLimitClientKey(request, "invite-validate")).toBe(
      "invite-validate:192.168.1.1",
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { consumeRateLimitSlot } from "./rateLimit.js";

// Make every Redis connection attempt fail so we can exercise the
// fail-closed vs fail-open paths without a live Redis (L2).
vi.mock("ioredis", () => {
  class Redis {
    status = "wait";
    async connect() {
      throw new Error("redis unavailable");
    }
    async incr() {
      throw new Error("redis unavailable");
    }
  }
  return { Redis };
});

describe("consumeRateLimitSlot", () => {
  it("allows requests under the limit in test mode (memory fallback)", async () => {
    const config = { nodeEnv: "test" };
    const first = await consumeRateLimitSlot("test-key", 5, 60_000, config);
    expect(first).toEqual({ ok: true });
    const second = await consumeRateLimitSlot("test-key", 5, 60_000, config);
    expect(second).toEqual({ ok: true });
  });

  it("returns retryAfterSec when limit exceeded", async () => {
    const key = `burst-${Date.now()}`;
    const config = { nodeEnv: "test" };
    for (let i = 0; i < 3; i += 1) {
      const ok = await consumeRateLimitSlot(key, 3, 60_000, config);
      expect(ok.ok).toBe(true);
    }
    const limited = await consumeRateLimitSlot(key, 3, 60_000, config);
    expect(limited.ok).toBe(false);
    if (!limited.ok) {
      expect(limited.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("fails closed (denies) when Redis is unavailable and failClosed is set", async () => {
    const config = {
      nodeEnv: "production",
      redisUrl: "redis://mock:6379",
      failClosed: true,
    };
    const result = await consumeRateLimitSlot("fc-key", 5, 60_000, config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("falls open to in-memory when Redis is unavailable and failClosed is unset", async () => {
    const config = {
      nodeEnv: "production",
      redisUrl: "redis://mock:6379",
    };
    const result = await consumeRateLimitSlot("fo-key", 5, 60_000, config);
    expect(result.ok).toBe(true);
  });
});

describe("validateProductionEnv", () => {
  it("exits when JWT_SECRET and CORS_ORIGIN missing in production", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as typeof process.exit);
    const { validateProductionEnv } = await import(
      "./validateProductionEnv.js"
    );
    expect(() =>
      validateProductionEnv({
        PORT: 3000,
        NODE_ENV: "production",
      }),
    ).toThrow("exit");
    exit.mockRestore();
  });

  // bugfix 0001: off production a missing JWT_SECRET must no longer kill the
  // boot — it warns and falls back to the labeled insecure dev default.
  it("falls back to the dev default when JWT_SECRET is missing off production", async () => {
    const prevJwt = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as typeof process.exit);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { validateProductionEnv, DEV_INSECURE_JWT_SECRET } = await import(
      "./validateProductionEnv.js"
    );
    expect(() =>
      validateProductionEnv({ PORT: 3000, NODE_ENV: "development" }),
    ).not.toThrow();
    expect(exit).not.toHaveBeenCalled();
    expect(process.env.JWT_SECRET).toBe(DEV_INSECURE_JWT_SECRET);
    exit.mockRestore();
    warn.mockRestore();
    if (prevJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwt;
  });

  it("does not require JWT_SECRET under NODE_ENV=test", async () => {
    const prevJwt = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const { validateProductionEnv } = await import(
      "./validateProductionEnv.js"
    );
    expect(() =>
      validateProductionEnv({ PORT: 3000, NODE_ENV: "test" }),
    ).not.toThrow();
    if (prevJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwt;
  });

  it("passes when production env is configured", async () => {
    const prevJwt = process.env.JWT_SECRET;
    const prevInternal = process.env.INTERNAL_API_SECRET;
    process.env.JWT_SECRET = "test-secret";
    process.env.INTERNAL_API_SECRET = "test-internal";
    const { validateProductionEnv } = await import(
      "./validateProductionEnv.js"
    );
    expect(() =>
      validateProductionEnv({
        PORT: 3000,
        NODE_ENV: "production",
        CORS_ORIGIN: "https://admin.example.com",
      }),
    ).not.toThrow();
    process.env.JWT_SECRET = prevJwt;
    process.env.INTERNAL_API_SECRET = prevInternal;
  });
});

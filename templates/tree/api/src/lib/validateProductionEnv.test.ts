/**
 * bugfix 0001: JWT_SECRET handling must
 *   - hard-fail in production when unset or equal to the insecure dev default;
 *   - warn and fall back to the labeled dev default off production (so a fresh
 *     local clone still boots);
 *   - stay a no-op under NODE_ENV=test.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiEnv } from "../app.js";
import {
  DEV_INSECURE_JWT_SECRET,
  validateProductionEnv,
} from "./validateProductionEnv.js";

function makeEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  return { PORT: 3000, ...overrides } as ApiEnv;
}

describe("validateProductionEnv", () => {
  beforeEach(() => {
    // Halt execution at the first exit, like the real process would.
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("hard-fails in production when JWT_SECRET is unset", () => {
    vi.stubEnv("JWT_SECRET", "");
    expect(() =>
      validateProductionEnv(makeEnv({ NODE_ENV: "production" })),
    ).toThrow(/process\.exit\(1\)/);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("JWT_SECRET is required in production"),
    );
  });

  it("hard-fails in production when JWT_SECRET is the insecure dev default", () => {
    vi.stubEnv("JWT_SECRET", DEV_INSECURE_JWT_SECRET);
    expect(() =>
      validateProductionEnv(makeEnv({ NODE_ENV: "production" })),
    ).toThrow(/process\.exit\(1\)/);
  });

  it("passes in production with a real JWT_SECRET and required config", () => {
    vi.stubEnv("JWT_SECRET", "a-strong-production-secret-value");
    vi.stubEnv("INTERNAL_API_SECRET", "internal-secret");
    expect(() =>
      validateProductionEnv(
        makeEnv({
          NODE_ENV: "production",
          CORS_ORIGIN: "https://__PROJECT_DOMAIN__",
        }),
      ),
    ).not.toThrow();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("warns and falls back to the dev default off production when JWT_SECRET is unset", () => {
    vi.stubEnv("JWT_SECRET", "");
    validateProductionEnv(makeEnv({ NODE_ENV: "development" }));
    expect(process.exit).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("insecure development default"),
    );
    expect(process.env.JWT_SECRET).toBe(DEV_INSECURE_JWT_SECRET);
  });

  it("treats an unset NODE_ENV as development and falls back", () => {
    vi.stubEnv("JWT_SECRET", "");
    validateProductionEnv(makeEnv());
    expect(process.exit).not.toHaveBeenCalled();
    expect(process.env.JWT_SECRET).toBe(DEV_INSECURE_JWT_SECRET);
  });

  it("leaves an existing dev JWT_SECRET untouched and does not warn", () => {
    vi.stubEnv("JWT_SECRET", "my-own-local-secret");
    validateProductionEnv(makeEnv({ NODE_ENV: "development" }));
    expect(console.warn).not.toHaveBeenCalled();
    expect(process.env.JWT_SECRET).toBe("my-own-local-secret");
  });

  it("is a no-op under NODE_ENV=test (no exit, no warn, no mutation)", () => {
    vi.stubEnv("JWT_SECRET", "");
    validateProductionEnv(makeEnv({ NODE_ENV: "test" }));
    expect(process.exit).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(process.env.JWT_SECRET).toBe("");
  });
});

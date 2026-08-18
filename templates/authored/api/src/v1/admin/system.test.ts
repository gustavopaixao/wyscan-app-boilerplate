import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkLogAgent,
  integrationStatus,
  registerAdminSystemRoutes,
} from "./system.js";

afterEach(() => vi.unstubAllGlobals());

/**
 * The point of this endpoint is to say what is switched on WITHOUT saying what
 * the values are. That property is what these assert.
 */
describe("integrationStatus", () => {
  it("reports presence as a boolean and never the value", () => {
    const rows = integrationStatus({
      MAILGUN_API_KEY: "key-abc123",
      MAILGUN_DOMAIN: "mg.example.com",
      GOOGLE_CLIENT_ID: "client-abc",
    } as NodeJS.ProcessEnv);

    expect(rows).toContainEqual({ key: "mailer", configured: true });
    expect(rows).toContainEqual({ key: "googleOauth", configured: true });
    expect(rows).toContainEqual({ key: "push", configured: false });

    // No secret may appear anywhere in the payload.
    expect(JSON.stringify(rows)).not.toMatch(
      /key-abc123|mg\.example\.com|client-abc/,
    );
  });

  it("needs every part of a multi-key integration", () => {
    const rows = integrationStatus({
      MAILGUN_API_KEY: "key",
    } as NodeJS.ProcessEnv);
    expect(rows).toContainEqual({ key: "mailer", configured: false });
  });

  it("treats whitespace as unset, so a blank line in .env is not 'configured'", () => {
    const rows = integrationStatus({
      GOOGLE_CLIENT_ID: "   ",
    } as NodeJS.ProcessEnv);
    expect(rows).toContainEqual({ key: "googleOauth", configured: false });
  });
});

describe("checkLogAgent", () => {
  it("is skipped, not down, when no agent is configured", async () => {
    await expect(checkLogAgent({} as NodeJS.ProcessEnv)).resolves.toBe(
      "skipped",
    );
  });

  it("is ok when the agent answers its health endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await expect(
      checkLogAgent({
        LOG_AGENT_URL: "http://log-agent:3090",
      } as NodeJS.ProcessEnv),
    ).resolves.toBe("ok");
  });

  it("is down when it cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );
    await expect(
      checkLogAgent({
        LOG_AGENT_URL: "http://log-agent:3090",
      } as NodeJS.ProcessEnv),
    ).resolves.toBe("down");
  });
});

describe("registerAdminSystemRoutes", () => {
  const app = new Hono();
  registerAdminSystemRoutes(app);

  it("binds the route", async () => {
    expect((await app.request("/api/v1/admin/settings")).status).not.toBe(404);
  });

  it("refuses an anonymous caller before probing anything", async () => {
    expect((await app.request("/api/v1/admin/settings")).status).toBe(401);
  });

  it("is read-only — there is no settings store to write to", async () => {
    for (const method of ["POST", "PATCH", "PUT"]) {
      expect(
        (await app.request("/api/v1/admin/settings", { method })).status,
      ).toBe(404);
    }
  });
});

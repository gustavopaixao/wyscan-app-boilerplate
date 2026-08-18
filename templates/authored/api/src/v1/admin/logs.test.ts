import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampTail,
  fetchAgentTail,
  isLogViewerEnabled,
  registerAdminLogRoutes,
} from "./logs.js";

const AGENT_ENV = {
  LOG_AGENT_URL: "http://log-agent:3090",
  LOG_AGENT_SECRET: "dev-log-agent-secret-min-16",
} as NodeJS.ProcessEnv;

afterEach(() => vi.unstubAllGlobals());

describe("isLogViewerEnabled", () => {
  it("is off unless explicitly switched on", () => {
    expect(isLogViewerEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(
      isLogViewerEnabled({ LOG_VIEWER_ENABLED: "1" } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      isLogViewerEnabled({ LOG_VIEWER_ENABLED: "true" } as NodeJS.ProcessEnv),
    ).toBe(true);
  });
});

describe("clampTail", () => {
  it("defaults, floors and caps", () => {
    expect(clampTail(null)).toBe(200);
    expect(clampTail("banana")).toBe(200);
    expect(clampTail("0")).toBe(1);
    expect(clampTail("999999")).toBe(1000);
  });
});

describe("fetchAgentTail", () => {
  it("sends the shared secret, which is the agent's only auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        lines: [],
        container: "demo-api",
        services: ["api"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAgentTail("api", 50, AGENT_ENV);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/internal/tail?service=api&tail=50");
    expect(init.headers["x-log-agent-secret"]).toBe(AGENT_ENV.LOG_AGENT_SECRET);
  });

  it("reports an unconfigured agent rather than calling nothing", async () => {
    const result = await fetchAgentTail("api", 50, {} as NodeJS.ProcessEnv);
    expect(result).toMatchObject({ ok: false, code: "LOG_AGENT_UNAVAILABLE" });
  });

  it("relays the service list, since only the agent knows what exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          lines: [],
          service: "api",
          services: ["api", "realtime"],
        }),
      }),
    );
    const result = await fetchAgentTail("", 50, AGENT_ENV);
    expect(result).toMatchObject({ ok: true, services: ["api", "realtime"] });
  });

  it("passes the agent's own code through, so the operator sees the real cause", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ code: "DOCKER_SOCKET_DENIED", message: "denied" }),
      }),
    );
    const result = await fetchAgentTail("api", 50, AGENT_ENV);
    expect(result).toMatchObject({ ok: false, code: "DOCKER_SOCKET_DENIED" });
  });

  it("treats an unreachable agent as unavailable, not as a crash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );
    const result = await fetchAgentTail("api", 50, AGENT_ENV);
    expect(result).toMatchObject({
      ok: false,
      status: 503,
      code: "LOG_AGENT_UNAVAILABLE",
    });
  });
});

describe("registerAdminLogRoutes", () => {
  const app = new Hono();
  registerAdminLogRoutes(app);

  it("binds the route", async () => {
    expect((await app.request("/api/v1/admin/logs")).status).not.toBe(404);
  });

  it("refuses an anonymous caller before consulting the agent", async () => {
    expect((await app.request("/api/v1/admin/logs")).status).toBe(401);
  });

  it("is read-only", async () => {
    for (const method of ["POST", "DELETE"]) {
      expect((await app.request("/api/v1/admin/logs", { method })).status).toBe(
        404,
      );
    }
  });
});

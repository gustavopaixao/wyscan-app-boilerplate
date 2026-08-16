import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

describe("GET /api/v1/health", () => {
  it("returns { ok: true }", async () => {
    const app = await createApp({ PORT: 3000, NODE_ENV: "test" });
    const res = await app.request("/api/v1/health", { method: "GET" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

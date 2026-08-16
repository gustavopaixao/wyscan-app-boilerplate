import { describe, expect, it } from "vitest";
import { createCoreApp } from "./app.js";

describe("createCoreApp", () => {
  it("root returns service json", async () => {
    const app = createCoreApp({
      PORT: 3000,
      NODE_ENV: "test",
    });
    const res = await app.request("/", { method: "GET" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      name: "__PROJECT_SLUG__-api",
      health: "/api/health",
      apiV1: "/api/v1",
    });
  });

  it("health skips infra when urls unset", async () => {
    const app = createCoreApp({
      PORT: 3000,
      NODE_ENV: "test",
    });
    const res = await app.request("/api/health", { method: "GET" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("CORS origin resolution (M3)", () => {
  it("uses the CORS_ORIGIN allowlist in non-production, not a wildcard", async () => {
    const app = createCoreApp({
      PORT: 3000,
      NODE_ENV: "development",
      CORS_ORIGIN: "https://admin.example.com",
    });
    const res = await app.request("/api/health", {
      method: "GET",
      headers: { Origin: "https://admin.example.com" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://admin.example.com",
    );
  });

  it("rejects unlisted origins when CORS_ORIGIN is set", async () => {
    const app = createCoreApp({
      PORT: 3000,
      NODE_ENV: "development",
      CORS_ORIGIN: "https://admin.example.com",
    });
    const res = await app.request("/api/health", {
      method: "GET",
      headers: { Origin: "https://evil.example" },
    });
    const acao = res.headers.get("access-control-allow-origin");
    expect(acao).not.toBe("*");
    expect(acao).not.toBe("https://evil.example");
  });

  it("does not serve a wildcard when NODE_ENV is unset and CORS_ORIGIN missing", async () => {
    const app = createCoreApp({ PORT: 3000 });
    const res = await app.request("/api/health", {
      method: "GET",
      headers: { Origin: "https://evil.example" },
    });
    expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
  });

  it("allows a wildcard in explicit development without CORS_ORIGIN", async () => {
    const app = createCoreApp({ PORT: 3000, NODE_ENV: "development" });
    const res = await app.request("/api/health", {
      method: "GET",
      headers: { Origin: "https://anything.example" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("HSTS header (L1)", () => {
  it("sets a strong HSTS header in production", async () => {
    const app = createCoreApp({
      PORT: 3000,
      NODE_ENV: "production",
      CORS_ORIGIN: "https://admin.example.com",
    });
    const res = await app.request("/api/health", { method: "GET" });
    expect(res.headers.get("strict-transport-security")).toContain(
      "max-age=63072000",
    );
  });

  it("omits HSTS outside production", async () => {
    const app = createCoreApp({ PORT: 3000, NODE_ENV: "development" });
    const res = await app.request("/api/health", { method: "GET" });
    expect(res.headers.get("strict-transport-security")).toBeNull();
  });
});

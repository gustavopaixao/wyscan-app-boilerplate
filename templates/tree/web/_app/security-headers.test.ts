import { describe, expect, it, vi } from "vitest";
import { securityHeaders } from "./security-headers";

async function cspForEnv(
  nodeEnv: "development" | "production",
): Promise<string> {
  vi.stubEnv("NODE_ENV", nodeEnv);
  const routes = await securityHeaders()();
  const csp = routes[0]?.headers.find(
    (header: { key: string; value: string }) =>
      header.key === "Content-Security-Policy",
  );
  return csp?.value ?? "";
}

describe("securityHeaders", () => {
  it("includes baseline hardening headers", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const routes = await securityHeaders()();
    const keys = routes[0]?.headers.map(
      (header: { key: string }) => header.key,
    );

    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Content-Security-Policy");
  });

  it("omits unsafe-eval from production CSP", async () => {
    const csp = await cspForEnv("production");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("'unsafe-inline'");
  });

  it("allows unsafe-eval in development CSP", async () => {
    const csp = await cspForEnv("development");
    expect(csp).toContain("'unsafe-eval'");
  });

  it("allows the wss:// upgrade of an https api origin (socket.io)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://__API_DOMAIN__");
    const csp = await cspForEnv("production");
    expect(csp).toContain("wss://__API_DOMAIN__");
  });

  it("allows ws:// and wss:// for a local http api origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const csp = await cspForEnv("development");
    expect(csp).toContain("ws://localhost:8080");
    expect(csp).toContain("wss://localhost:8080");
  });

  it("adds HSTS only in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const prodRoutes = await securityHeaders()();
    vi.stubEnv("NODE_ENV", "development");
    const devRoutes = await securityHeaders()();

    const prodKeys = prodRoutes[0]?.headers.map(
      (header: { key: string }) => header.key,
    );
    const devKeys = devRoutes[0]?.headers.map(
      (header: { key: string }) => header.key,
    );

    expect(prodKeys).toContain("Strict-Transport-Security");
    expect(devKeys).not.toContain("Strict-Transport-Security");
  });
});

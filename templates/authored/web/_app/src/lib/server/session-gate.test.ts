import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./auth-cookies";
import { applySessionGate, isPublicPath, splitLocale } from "./session-gate";

function request(pathname: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(`https://example.test${pathname}`));
  for (const [name, value] of Object.entries(cookies))
    req.cookies.set(name, value);
  return req;
}

describe("splitLocale", () => {
  it("strips a known locale prefix", () => {
    expect(splitLocale("/pt-BR/sign-in")).toEqual({
      locale: "pt-BR",
      path: "/sign-in",
    });
  });

  it("leaves an unprefixed path alone", () => {
    expect(splitLocale("/sign-in")).toEqual({ locale: "en", path: "/sign-in" });
  });

  it("handles a bare locale root", () => {
    expect(splitLocale("/en")).toEqual({ locale: "en", path: "/" });
  });
});

describe("isPublicPath", () => {
  it("covers every unauthenticated screen", () => {
    for (const p of [
      "/sign-in",
      "/register",
      "/verify",
      "/forgot-password",
      "/reset-password",
    ]) {
      expect(isPublicPath(p), p).toBe(true);
    }
  });

  it("does not treat a prefix collision as public", () => {
    // "/register-interest" must not inherit "/register"'s public status.
    expect(isPublicPath("/register-interest")).toBe(false);
  });

  it("rejects app paths", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
  });
});

describe("applySessionGate", () => {
  it("redirects an anonymous visitor to sign-in", () => {
    const response = applySessionGate(request("/en/settings"));
    expect(response?.status).toBe(307);
    const location = new URL(response?.headers.get("location") ?? "");
    expect(location.pathname).toBe("/en/sign-in");
    expect(location.searchParams.get("next")).toBe("/settings");
  });

  it("keeps the locale when redirecting", () => {
    const response = applySessionGate(request("/pt-BR/settings"));
    expect(new URL(response?.headers.get("location") ?? "").pathname).toBe(
      "/pt-BR/sign-in",
    );
  });

  it("lets an anonymous visitor reach sign-in", () => {
    expect(applySessionGate(request("/en/sign-in"))).toBeNull();
  });

  it("lets a signed-in user through to the app", () => {
    expect(
      applySessionGate(request("/en/settings", { [ACCESS_COOKIE]: "t" })),
    ).toBeNull();
  });

  it("bounces a signed-in user away from sign-in", () => {
    const response = applySessionGate(
      request("/en/sign-in", { [ACCESS_COOKIE]: "t" }),
    );
    expect(new URL(response?.headers.get("location") ?? "").pathname).toBe(
      "/en",
    );
  });

  // An expired access token must not sign the user out: the refresh cookie
  // outlives it and upstream-api.ts will spend it on the next call.
  it("treats a refresh-only session as signed in", () => {
    expect(
      applySessionGate(request("/en/settings", { [REFRESH_COOKIE]: "r" })),
    ).toBeNull();
  });
});

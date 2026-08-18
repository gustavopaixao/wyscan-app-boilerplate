import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./auth-cookies";
import {
  applySessionGate,
  decodeJwtExp,
  isSessionUsable,
} from "./session-gate";

/** Build an unsigned JWT-shaped token whose `exp` is `offsetSeconds` from now. */
function tokenExpiringIn(offsetSeconds: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + offsetSeconds };
  const encode = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

function request(pathname: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(`https://admin.example.test${pathname}`));
  for (const [name, value] of Object.entries(cookies))
    req.cookies.set(name, value);
  return req;
}

describe("decodeJwtExp", () => {
  it("reads exp from a well-formed token", () => {
    expect(decodeJwtExp(tokenExpiringIn(60))).toBeGreaterThan(
      Date.now() / 1000,
    );
  });

  it("returns null for junk rather than throwing", () => {
    expect(decodeJwtExp(undefined)).toBeNull();
    expect(decodeJwtExp("")).toBeNull();
    expect(decodeJwtExp("not-a-jwt")).toBeNull();
    expect(decodeJwtExp("a.b.c")).toBeNull();
  });
});

describe("isSessionUsable", () => {
  it("accepts a live access token", () => {
    expect(isSessionUsable(tokenExpiringIn(300), undefined)).toBe(true);
  });

  // The common case after a lunch break: access expired, refresh still good.
  it("accepts an expired access token when refresh is live", () => {
    expect(isSessionUsable(tokenExpiringIn(-10), tokenExpiringIn(3600))).toBe(
      true,
    );
  });

  it("rejects when both are expired", () => {
    expect(isSessionUsable(tokenExpiringIn(-10), tokenExpiringIn(-10))).toBe(
      false,
    );
  });

  it("rejects when there is nothing at all", () => {
    expect(isSessionUsable(undefined, undefined)).toBe(false);
  });
});

describe("applySessionGate", () => {
  it("redirects an anonymous visitor to sign-in", () => {
    const response = applySessionGate(request("/"));
    expect(new URL(response?.headers.get("location") ?? "").pathname).toBe(
      "/sign-in",
    );
  });

  it("lets an admin with a live session through", () => {
    expect(
      applySessionGate(request("/", { [ACCESS_COOKIE]: tokenExpiringIn(300) })),
    ).toBeNull();
  });

  it("bounces a signed-in admin away from sign-in", () => {
    const response = applySessionGate(
      request("/sign-in", { [ACCESS_COOKIE]: tokenExpiringIn(300) }),
    );
    expect(new URL(response?.headers.get("location") ?? "").pathname).toBe("/");
  });

  it("lets an anonymous visitor reach sign-in", () => {
    expect(applySessionGate(request("/sign-in"))).toBeNull();
  });

  // A dead session must be cleared, not merely redirected past, or every load
  // re-does this work and the console looks half signed-in.
  it("clears cookies when the session is beyond reviving", () => {
    const response = applySessionGate(
      request("/", {
        [ACCESS_COOKIE]: tokenExpiringIn(-60),
        [REFRESH_COOKIE]: tokenExpiringIn(-60),
      }),
    );
    expect(response?.cookies.get(ACCESS_COOKIE)?.value).toBe("");
    expect(response?.cookies.get(REFRESH_COOKIE)?.value).toBe("");
  });
});

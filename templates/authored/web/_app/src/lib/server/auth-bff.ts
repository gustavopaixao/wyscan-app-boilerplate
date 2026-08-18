/**
 * Factories for the BFF auth routes.
 *
 * Each route under `src/app/api/auth/` is a one-liner over one of these, so the
 * cookie handling and CSRF check exist once rather than eleven times.
 *
 * Two shapes:
 *   createSessionRoute    upstream returns tokens -> store them, return the user
 *   createPassthroughRoute upstream returns a message -> relay it, no session
 */
import { NextResponse } from "next/server";
import { clearTokenCookies, setTokenCookies } from "./auth-cookies";
import { csrfForbiddenResponse, isSameOriginRequest } from "./csrf";
import { upstreamFetch } from "./upstream-api";

type UpstreamAuthBody = {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
  /** Registration is incomplete; the client must collect a code. */
  requiresVerification?: boolean;
  userId?: string;
  email?: string;
  message?: string;
};

async function readRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/**
 * A route that establishes a session: login, verify-email, google, apple.
 *
 * The tokens are consumed here and never forwarded to the browser — that is the
 * entire point of the BFF. Only the user object crosses back.
 */
export function createSessionRoute(path: string) {
  return async function POST(request: Request): Promise<NextResponse> {
    if (!isSameOriginRequest(request)) return csrfForbiddenResponse();

    const result = await upstreamFetch(path, {
      method: "POST",
      body: await readRequestBody(request),
    });
    const body = (result.body ?? {}) as UpstreamAuthBody;

    if (result.status >= 400) {
      return NextResponse.json(
        { message: body.message ?? "Request failed." },
        {
          status: result.status,
        },
      );
    }

    // Pending accounts get a 200 with no tokens — relay it so the client can
    // route to the verification screen.
    if (body.requiresVerification) {
      return NextResponse.json({
        requiresVerification: true,
        userId: body.userId,
        email: body.email,
      });
    }

    if (!body.accessToken) {
      return NextResponse.json(
        { message: "The server did not return a session." },
        { status: 502 },
      );
    }

    const response = NextResponse.json({ user: body.user });
    return setTokenCookies(response, {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    });
  };
}

/**
 * A route that relays a result without establishing a session: register,
 * resend-code, forgot-password, reset-password.
 */
export function createPassthroughRoute(path: string) {
  return async function POST(request: Request): Promise<NextResponse> {
    if (!isSameOriginRequest(request)) return csrfForbiddenResponse();

    const result = await upstreamFetch(path, {
      method: "POST",
      body: await readRequestBody(request),
    });

    return NextResponse.json(result.body ?? {}, { status: result.status });
  };
}

/** Sign out: best-effort upstream revoke, then clear cookies regardless. */
export function createLogoutRoute() {
  return async function POST(request: Request): Promise<NextResponse> {
    if (!isSameOriginRequest(request)) return csrfForbiddenResponse();

    // Failure here is not fatal — the cookies are cleared either way, so the
    // user is signed out locally even if the API is unreachable.
    await upstreamFetch("/api/v1/auth/logout", {
      method: "POST",
      body: {},
      authenticated: true,
    }).catch(() => undefined);

    return clearTokenCookies(NextResponse.json({ ok: true }));
  };
}

/**
 * Session probe used by the client-side guard. Returns the current user, or
 * 401 with the cookies cleared so a dead session cannot linger.
 */
export function createSessionProbeRoute() {
  return async function GET(): Promise<NextResponse> {
    const result = await upstreamFetch("/api/v1/me", { authenticated: true });

    if (result.status === 401) {
      return clearTokenCookies(
        NextResponse.json(
          { authenticated: false, user: null },
          { status: 401 },
        ),
      );
    }
    if (result.status >= 400) {
      // Upstream trouble is not proof the session is bad — do NOT clear cookies
      // here, or an API blip would sign everyone out.
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: result.status },
      );
    }

    const body = (result.body ?? {}) as { user?: unknown };
    const response = NextResponse.json({
      authenticated: true,
      user: body.user,
    });
    // Carry over tokens rotated during the probe.
    return result.setCookies
      ? setTokenCookies(response, result.setCookies)
      : response;
  };
}

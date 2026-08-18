/**
 * Server-side calls to the API, with transparent token refresh.
 *
 * Reads the access token from the HttpOnly cookie, and on a 401 spends the
 * refresh token once and retries. The rotated tokens come back as `setCookies`
 * for the caller to write onto its response — this module cannot set cookies
 * itself, because a Route Handler owns its own NextResponse.
 */
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  type SessionTokens,
} from "./auth-cookies";
import { apiBaseUrl, internalApiHeaders } from "./internal-api-client";

/** Upstream calls should fail fast rather than hold a Next worker open. */
const DEFAULT_TIMEOUT_MS = 10_000;

export type UpstreamResult = {
  status: number;
  body: unknown;
  /** Present when the token was rotated mid-flight; write these to the response. */
  setCookies?: SessionTokens;
};

type UpstreamOptions = {
  method?: string;
  body?: unknown;
  /** Attach the caller's access token. */
  authenticated?: boolean;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // A non-JSON body means a proxy or crash page, not the API.
    return { message: text.slice(0, 500) };
  }
}

async function call(
  path: string,
  options: UpstreamOptions,
  accessToken?: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    return await fetch(`${apiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...internalApiHeaders(),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      // Always hit the API; this data is per-user by definition.
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Spend the refresh token for a fresh pair. Returns null when it is spent. */
async function refreshTokens(
  refreshToken: string,
): Promise<SessionTokens | null> {
  const response = await call("/api/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
  if (!response.ok) return null;

  const body = (await readJson(response)) as SessionTokens | null;
  return body?.accessToken ? body : null;
}

export async function upstreamFetch(
  path: string,
  options: UpstreamOptions = {},
): Promise<UpstreamResult> {
  const jar = await cookies();
  const accessToken = options.authenticated
    ? jar.get(ACCESS_COOKIE)?.value
    : undefined;

  try {
    let response = await call(path, options, accessToken);

    // One refresh attempt, only for authenticated calls that actually had a
    // token. Retrying an anonymous 401 would loop pointlessly.
    if (response.status === 401 && options.authenticated) {
      const refreshToken = jar.get(REFRESH_COOKIE)?.value;
      const rotated = refreshToken ? await refreshTokens(refreshToken) : null;
      if (!rotated) {
        return { status: 401, body: await readJson(response) };
      }
      response = await call(path, options, rotated.accessToken);
      return {
        status: response.status,
        body: await readJson(response),
        setCookies: rotated,
      };
    }

    return { status: response.status, body: await readJson(response) };
  } catch (error) {
    // Abort or connection refused: report it as a gateway problem rather than
    // letting the route handler throw a 500 with a stack trace.
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      status: timedOut ? 504 : 502,
      body: {
        message: timedOut
          ? "The server took too long to respond."
          : "Service unavailable.",
      },
    };
  }
}

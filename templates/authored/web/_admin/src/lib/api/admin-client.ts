/**
 * The console's data client for `/api/v1/*`.
 *
 * Every call goes through this app's own BFF proxy, never to the API directly:
 * the session lives in HttpOnly cookies the browser cannot read, and the proxy
 * is what attaches the bearer token and re-checks the admin role. So the only
 * thing a caller supplies is the path below `/api/v1`.
 *
 * `credentials: "same-origin"` is required — without it the cookies are not
 * sent and every request comes back 401.
 */
import { handleUnauthorized } from "@/lib/auth/handle-unauthorized";

export class AdminApiError extends Error {
  /** 0 when the request never reached the server. */
  readonly status: number;
  /**
   * The API's machine-readable code, when it sent one.
   *
   * A status alone is not enough for every caller: the log viewer has to tell
   * "the agent is down" from "the socket is denied", and both are 503.
   */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * A dead session and a revoked role are the same thing here.
 *
 * The BFF answers 403 only when `/me` says the caller is no longer an admin —
 * there is no per-resource permission model in the console — so both statuses
 * mean "you can no longer be here" and both end in a sign-out.
 */
function isSessionFailure(status: number): boolean {
  return status === 401 || status === 403;
}

export async function adminFetch<T>(
  path: string,
  init?: { signal?: AbortSignal },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: init?.signal,
    });
  } catch (cause) {
    // An aborted query is TanStack cancelling it, not a failure to report.
    if (cause instanceof DOMException && cause.name === "AbortError")
      throw cause;
    throw new AdminApiError("Network request failed.", 0);
  }

  if (isSessionFailure(response.status)) {
    // Single-flight: several queries failing at once still produce one redirect.
    void handleUnauthorized();
    throw new AdminApiError("Session is no longer valid.", response.status);
  }

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new AdminApiError(
      body.message ?? `Request failed with ${response.status}.`,
      response.status,
      body.code,
    );
  }

  return body as T;
}

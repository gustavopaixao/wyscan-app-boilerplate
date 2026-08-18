/**
 * Session probe against `/api/auth/session`.
 *
 * De-duplicated: AuthGuard re-checks on mount, on focus and on visibility
 * change, which on a tab switch can fire twice in the same tick. Without the
 * in-flight promise those become two upstream round trips — and, worse, two
 * concurrent refresh attempts, of which the second would present a token the
 * first had already rotated away.
 */
import type { AuthUser } from "@/stores/auth-store";

export type ClientSession = { authenticated: boolean; user: AuthUser | null };

const TIMEOUT_MS = 5_000;

let inFlight: Promise<ClientSession> | null = null;

async function probe(): Promise<ClientSession> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return { authenticated: false, user: null };

    const data = (await response.json()) as ClientSession;
    return {
      authenticated: Boolean(data.authenticated),
      user: data.user ?? null,
    };
  } catch {
    // Treated as signed out for rendering purposes. The cookies are untouched,
    // so a transient failure resolves itself on the next probe.
    return { authenticated: false, user: null };
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchClientSession(): Promise<ClientSession> {
  if (!inFlight) {
    inFlight = probe().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

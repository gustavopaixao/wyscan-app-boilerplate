/**
 * Session probe against `/api/auth/session`, de-duplicated so overlapping
 * checks (mount + focus + visibility) cost one round trip and cannot race two
 * concurrent token refreshes.
 */
import type { AdminUser } from "@/stores/auth-store";

export type ClientSession = { authenticated: boolean; user: AdminUser | null };

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

/**
 * Browser-side calls to this app's own BFF (`/api/auth/*`).
 *
 * Never calls the API directly: the session lives in HttpOnly cookies that only
 * the BFF can read, and `credentials: "same-origin"` is what carries them.
 */
import type { AuthUser } from "@/stores/auth-store";

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export type SessionResult =
  | { user: AuthUser; requiresVerification?: false }
  | { requiresVerification: true; userId: string; email: string };

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    // A network failure has no status; callers map this to a connection error.
    throw new AuthError("network", 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthError(
      (data as { message?: string }).message ?? "request_failed",
      response.status,
    );
  }
  return data as T;
}

/**
 * Codes are 8 chars of [A-Z0-9]. Users paste them with stray spaces or hyphens
 * from mail clients, so normalize before the API's strict regex rejects them.
 */
export function normalizeCode(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
}

export const authClient = {
  signIn: (email: string, password: string) =>
    post<SessionResult>("login", { email, password }),

  register: (email: string, password: string, displayName: string) =>
    post<{ requiresVerification: true; userId: string; email: string }>(
      "register",
      {
        email,
        password,
        displayName,
      },
    ),

  verifyEmail: (email: string, code: string) =>
    post<SessionResult>("verify-email", { email, code: normalizeCode(code) }),

  resendCode: (userId: string) =>
    post<{ message: string }>("resend-code", { userId }),

  forgotPassword: (email: string) =>
    post<{ message: string }>("forgot-password", { email }),

  resetPassword: (email: string, code: string, password: string) =>
    post<{ message: string }>("reset-password", {
      email,
      code: normalizeCode(code),
      password,
    }),

  signInWithGoogle: (idToken: string) =>
    post<SessionResult>("google", { idToken }),

  signInWithApple: (idToken: string, displayName?: string) =>
    post<SessionResult>("apple", { idToken, displayName }),

  signOut: () => post<{ ok: true }>("logout", {}),
};

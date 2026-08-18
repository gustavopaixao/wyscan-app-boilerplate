"use client";

/**
 * React Query bindings over `authClient`.
 *
 * Every mutation that establishes a session funnels through `adoptSession`, so
 * the store update and the post-auth redirect exist once.
 */
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  AuthError,
  authClient,
  type SessionResult,
} from "@/lib/auth/auth-client";
import {
  requestAppleIdToken,
  requestGoogleIdToken,
} from "@/lib/auth/oauth-loaders";
import { type AuthUser, useAuthStore } from "@/stores/auth-store";

/** Map a thrown AuthError onto a translated, user-facing message. */
export function useAuthErrorMessage() {
  const t = useTranslations("auth");
  return useCallback(
    (error: unknown): string => {
      if (error instanceof AuthError) {
        if (error.status === 0) return t("errorNetwork");
        if (error.status === 401) return t("errorInvalidCredentials");
        // The API's own message is more specific than anything generic we could
        // substitute (e.g. which password rule failed).
        if (error.message && error.message !== "request_failed")
          return error.message;
      }
      return t("errorGeneric");
    },
    [t],
  );
}

/**
 * Constrain the post-sign-in destination to a path on this origin.
 *
 * `next` comes from the query string, so it is attacker-controlled. A bare
 * `startsWith("/")` check is NOT enough: `//evil.com` passes it and browsers
 * treat a protocol-relative URL as absolute, which turns sign-in into an open
 * redirect. Rejecting a second leading slash and any scheme separator closes
 * both shapes.
 */
export function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.includes(":")) return "/";
  // Backslashes are normalised to slashes by some browsers, so `/\evil.com`
  // would become `//evil.com`.
  if (next.includes("\\")) return "/";
  return next;
}

/**
 * Adopt a successful auth response: store the user and navigate, or hand back
 * the pending-verification branch for the caller to route on.
 */
function useAdoptSession() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setSessionReady = useAuthStore((s) => s.setSessionReady);

  return useCallback(
    (result: SessionResult, next?: string) => {
      if (result.requiresVerification) return result;

      setUser(result.user as AuthUser);
      setSessionReady(true);
      // `replace`, not `push`: the sign-in page must not be reachable by Back.
      router.replace(safeNext(next));
      return result;
    },
    [router, setUser, setSessionReady],
  );
}

export function useSignIn(next?: string) {
  const adopt = useAdoptSession();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.signIn(email, password),
    onSuccess: (result) => adopt(result, next),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName: string;
    }) => authClient.register(email, password, displayName),
  });
}

export function useVerifyEmail(next?: string) {
  const adopt = useAdoptSession();
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authClient.verifyEmail(email, code),
    onSuccess: (result) => adopt(result, next),
  });
}

export function useResendCode() {
  return useMutation({
    mutationFn: (userId: string) => authClient.resendCode(userId),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authClient.forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({
      email,
      code,
      password,
    }: {
      email: string;
      code: string;
      password: string;
    }) => authClient.resetPassword(email, code, password),
  });
}

export function useOAuth(provider: "google" | "apple", next?: string) {
  const adopt = useAdoptSession();
  return useMutation({
    mutationFn: async () => {
      if (provider === "google") {
        return authClient.signInWithGoogle(await requestGoogleIdToken());
      }
      const { idToken, displayName } = await requestAppleIdToken();
      return authClient.signInWithApple(idToken, displayName);
    },
    onSuccess: (result) => adopt(result, next),
  });
}

export function useSignOut() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: () => authClient.signOut(),
    // Clear locally even if the upstream revoke failed — the cookies are gone
    // either way, so leaving the store populated would show a phantom session.
    onSettled: () => {
      clear();
      router.replace("/sign-in");
    },
  });
}

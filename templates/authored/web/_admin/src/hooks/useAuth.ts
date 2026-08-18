"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { isAppAdminRole } from "@/lib/admin-access";
import { ta } from "@/lib/i18n/authStrings";
import { type AdminUser, useAuthStore } from "@/stores/auth-store";

class AdminAuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function toAuthMessage(error: unknown): string {
  if (error instanceof AdminAuthError) {
    if (error.status === 0) return ta("auth_error_network");
    if (error.status === 401) return ta("auth_error_invalid_credentials");
    if (error.status === 403)
      return error.message || ta("auth_error_forbidden");
    if (error.message) return error.message;
  }
  return ta("auth_error_generic");
}

export function useSignIn() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setSessionReady = useAuthStore((s) => s.setSessionReady);

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      let response: Response;
      try {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email, password }),
        });
      } catch {
        throw new AdminAuthError("network", 0);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new AdminAuthError(
          (data as { message?: string }).message ?? "",
          response.status,
        );
      }

      const user = (data as { user?: AdminUser }).user;
      // The BFF already rejects non-admins; this is belt and braces against a
      // future change there silently widening access.
      if (!isAppAdminRole(user?.role)) {
        throw new AdminAuthError(ta("auth_error_forbidden"), 403);
      }
      return user as AdminUser;
    },
    onSuccess: (user) => {
      setUser(user);
      setSessionReady(true);
      router.replace("/");
    },
  });
}

export function useSignOut() {
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: () =>
      fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }),
    onSettled: () => {
      clear();
      // Full load: drop every cached query from the previous session.
      window.location.replace("/sign-in");
    },
  });
}

/** Convenience selector for surfaces that just need the current admin. */
export function useCurrentAdmin() {
  return useAuthStore(useCallback((s) => s.user, []));
}

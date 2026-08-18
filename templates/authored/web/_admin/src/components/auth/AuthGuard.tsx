"use client";

/**
 * Keeps the admin auth store in step with the real session.
 *
 * `middleware.ts` already decides who may load a page; this exists so surfaces
 * have a populated `user`, and so a role revoked mid-session is noticed rather
 * than leaving a console that looks usable and 403s on every action.
 */
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { handleUnauthorized } from "@/lib/auth/handle-unauthorized";
import { fetchClientSession } from "@/lib/auth/verify-client-session";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);
  const setSessionReady = useAuthStore((s) => s.setSessionReady);

  useEffect(() => {
    if (pathname === "/sign-in") {
      setSessionReady(true);
      return;
    }

    let cancelled = false;

    const check = async () => {
      const session = await fetchClientSession();
      if (cancelled) return;

      if (!session.authenticated) {
        // Middleware let this request through, so the session died since. Sign
        // out properly rather than leaving a console that cannot do anything.
        void handleUnauthorized();
        return;
      }

      setUser(session.user);
      setSessionReady(true);
    };

    void check();

    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, setUser, setSessionReady]);

  return <>{children}</>;
}

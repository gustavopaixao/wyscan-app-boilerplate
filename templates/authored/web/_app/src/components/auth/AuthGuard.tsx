"use client";

/**
 * Keeps the client-side auth store in step with the real session.
 *
 * The edge gate in `proxy.ts` already decides who may load a page; this exists
 * so components have a populated `user` and so a session that dies in another
 * tab (or expires while the tab is idle) is noticed rather than leaving a stale
 * UI signed in.
 *
 * It renders children unconditionally — blocking here would double the gating
 * and produce a spinner on every navigation.
 */
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { fetchClientSession } from "@/lib/auth/verify-client-session";
import { PUBLIC_APP_PATHS } from "@/lib/server/session-gate";
import { type AuthUser, useAuthStore } from "@/stores/auth-store";

function isAuthScreen(pathname: string): boolean {
  return PUBLIC_APP_PATHS.some((p) => pathname.endsWith(p));
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);
  const setSessionReady = useAuthStore((s) => s.setSessionReady);

  useEffect(() => {
    // Skip the probe on the auth screens themselves: nobody there has a session
    // yet, and it would cost a request on every keystroke-triggered re-render.
    if (isAuthScreen(pathname)) {
      setSessionReady(true);
      return;
    }

    let cancelled = false;

    const check = async () => {
      const session = await fetchClientSession();
      if (cancelled) return;
      setUser((session.user as AuthUser | null) ?? null);
      setSessionReady(true);
    };

    void check();

    // Re-check when the tab regains attention: the session may have been ended
    // elsewhere, or the access token may have expired while we were away.
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

"use client";

/**
 * The console shell: sidebar, header, and the content column.
 *
 * Mounted in the ROOT layout rather than in a route group, so it also wraps the
 * reference-owned `app/page.tsx` without that page and a group page both
 * resolving to `/`. The trade is that the shell has to know which routes are
 * public — the same pathname check `AuthGuard` already makes.
 *
 * The content column is offset with left PADDING rather than a flex row: the
 * sidebar is `position: fixed`, so it is out of flow, and padding is what can be
 * animated smoothly when the rail collapses.
 */
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { tn } from "@/lib/i18n/navStrings";
import { PUBLIC_PATHS } from "@/lib/server/session-gate";
import { useUIStore } from "@/stores/ui-store";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  // Sign-in owns the whole viewport and must not be framed by the console.
  if (isPublicPath(pathname)) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />

      {sidebarOpen ? (
        <button
          type="button"
          aria-label={tn("nav_close_menu")}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      ) : null}

      <div
        className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <Header />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

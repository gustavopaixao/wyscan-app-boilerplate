"use client";

/**
 * Sticky top bar.
 *
 * Carries the two sidebar controls and the account block. Sign-out is a plain
 * icon button rather than an item inside a dropdown: it is the one action every
 * admin needs to find instantly, and a menu is a step in the way.
 */
import { MdLogout, MdMenu, MdPerson } from "react-icons/md";
import { useSignOut } from "@/hooks/useAuth";
import { tn } from "@/lib/i18n/navStrings";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card px-4 sm:gap-4 sm:px-6">
      {/* Below lg this opens the drawer; at lg and up the other button collapses
          the rail. Same icon, deliberately different jobs. */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={tn("nav_open_menu")}
        aria-expanded={sidebarOpen}
        aria-controls="admin-sidebar"
        className="rounded-lg p-2 text-muted transition-colors hover:bg-accent-muted hover:text-foreground lg:hidden"
      >
        <MdMenu className="size-5" />
      </button>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={tn("nav_toggle_sidebar")}
        className="hidden rounded-lg p-2 text-muted transition-colors hover:bg-accent-muted hover:text-foreground lg:block"
      >
        <MdMenu className="size-5" />
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        aria-label={tn("nav_sign_out")}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-accent-muted hover:text-foreground disabled:opacity-50"
      >
        <MdLogout className="size-5" />
      </button>

      <div className="flex items-center gap-2 pl-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
          <MdPerson className="size-5" aria-hidden />
        </span>
        <span className="hidden text-sm font-medium text-foreground sm:inline-block">
          {user?.displayName || user?.email || tn("nav_account")}
        </span>
      </div>
    </header>
  );
}

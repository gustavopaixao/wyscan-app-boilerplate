"use client";

/**
 * The console's primary navigation.
 *
 * One component serving two very different things: a persistent rail at `lg` and
 * up, and a modal drawer below it. The accessibility behaviour (focus trap,
 * scroll lock) applies only in the drawer case — see `useDrawerA11y`.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDrawerA11y } from "@/hooks/useDrawerA11y";
import { tn } from "@/lib/i18n/navStrings";
import { useUIStore } from "@/stores/ui-store";
import { BrandWordmark } from "./BrandWordmark";
import {
  groupHasActiveItem,
  linkIsActive,
  navGroups,
  navLabel,
  navRootItem,
} from "./navItems";
import { SidebarGroup } from "./SidebarGroup";

export function Sidebar() {
  const pathname = usePathname();
  const asideRef = useRef<HTMLElement>(null);

  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const open = useUIStore((s) => s.sidebarOpen);
  const setOpen = useUIStore((s) => s.setSidebarOpen);
  const groupPrefs = useUIStore((s) => s.sidebarGroups);
  const setGroupExpanded = useUIStore((s) => s.setSidebarGroupExpanded);

  useDrawerA11y({
    open,
    onClose: () => setOpen(false),
    containerRef: asideRef,
  });

  // Close the drawer on navigation — otherwise it covers the page the user just
  // asked for.
  //
  // `pathname` is a trigger, not an input: the body never reads it. Referencing
  // it explicitly keeps the dependency honest, because the lint rule would
  // otherwise flag it as unnecessary and "fixing" that removes the behaviour.
  useEffect(() => {
    void pathname;
    setOpen(false);
  }, [pathname, setOpen]);

  const RootIcon = navRootItem.icon;
  const rootActive = linkIsActive(pathname, navRootItem.href);

  /** A group defaults to expanded when it contains the current route. */
  const isExpanded = (groupId: string) =>
    groupPrefs[groupId] ??
    groupHasActiveItem(
      navGroups.find((g) => g.id === groupId) ?? {
        id: "",
        labelKey: "nav_menu",
        items: [],
      },
      pathname,
    );

  return (
    <aside
      id="admin-sidebar"
      ref={asideRef}
      tabIndex={-1}
      aria-label={tn("nav_menu")}
      className={`fixed left-0 top-0 z-40 flex h-dvh flex-col border-r border-border bg-card transition-all duration-200 focus:outline-none lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      } w-64 ${collapsed ? "lg:w-20" : "lg:w-64"}`}
    >
      {/* h-16 matches the header exactly so the two seams line up. */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-border px-4 ${
          collapsed ? "lg:justify-center lg:px-0" : ""
        }`}
      >
        <BrandWordmark collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <Link
          href={navRootItem.href}
          aria-current={rootActive ? "page" : undefined}
          title={collapsed ? navLabel(navRootItem) : undefined}
          className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
          } ${
            rootActive
              ? "bg-accent-muted text-accent"
              : "text-muted hover:bg-accent-muted hover:text-foreground"
          }`}
        >
          <RootIcon aria-hidden className="size-5 shrink-0" />
          {/* The label is hidden on the desktop rail but kept for the drawer,
              which is always full width. */}
          <span className={collapsed ? "lg:hidden" : ""}>
            {navLabel(navRootItem)}
          </span>
        </Link>

        {navGroups.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            pathname={pathname}
            expanded={isExpanded(group.id)}
            onToggle={(next) => setGroupExpanded(group.id, next)}
          />
        ))}
      </nav>
    </aside>
  );
}

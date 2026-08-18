/**
 * The admin navigation tree.
 *
 * Generic on purpose — a generated project has no features yet. Edit this array
 * and the sidebar follows; nothing else needs to change.
 */
import type { IconType } from "react-icons";
import { MdDashboard, MdPeople, MdSettings, MdTerminal } from "react-icons/md";
import { type NavStringKey, tn } from "@/lib/i18n/navStrings";

export type NavItem = {
  href: string;
  labelKey: NavStringKey;
  icon: IconType;
  /**
   * Match the href exactly instead of as a prefix. Needed when a section index
   * shares a prefix with its children, or `/settings` lights up while you are
   * on `/settings/billing`.
   */
  exact?: boolean;
};

export type NavGroup = {
  id: string;
  labelKey: NavStringKey;
  items: NavItem[];
};

/** Pinned above the groups; always the first thing in the sidebar. */
export const navRootItem: NavItem = {
  href: "/",
  labelKey: "nav_dashboard",
  icon: MdDashboard,
};

export const navGroups: NavGroup[] = [
  {
    id: "management",
    labelKey: "nav_group_management",
    items: [{ href: "/users", labelKey: "nav_users", icon: MdPeople }],
  },
  {
    id: "system",
    labelKey: "nav_group_system",
    items: [
      {
        href: "/settings",
        labelKey: "nav_settings",
        icon: MdSettings,
        exact: true,
      },
      { href: "/logs", labelKey: "nav_logs", icon: MdTerminal },
    ],
  },
];

/**
 * `/` only ever matches itself — a prefix match would light the dashboard up on
 * every route in the console.
 */
export function linkIsActive(
  pathname: string,
  href: string,
  exact = false,
): boolean {
  if (href === "/" || exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function groupHasActiveItem(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) =>
    linkIsActive(pathname, item.href, item.exact),
  );
}

/** Label lookup, so surfaces never reach into the string table themselves. */
export function navLabel(item: { labelKey: NavStringKey }): string {
  return tn(item.labelKey);
}

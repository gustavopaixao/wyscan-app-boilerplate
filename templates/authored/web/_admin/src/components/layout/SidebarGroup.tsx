"use client";

import Link from "next/link";
import { MdChevronRight, MdExpandMore } from "react-icons/md";
import { tn } from "@/lib/i18n/navStrings";
import {
  groupHasActiveItem,
  linkIsActive,
  type NavGroup,
  navLabel,
} from "./navItems";

type Props = {
  group: NavGroup;
  pathname: string;
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
};

export function SidebarGroup({ group, pathname, expanded, onToggle }: Props) {
  const hasActive = groupHasActiveItem(group, pathname);
  const listId = `sidebar-group-${group.id}`;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => onToggle(!expanded)}
        aria-expanded={expanded}
        aria-controls={listId}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-accent-muted ${
          hasActive ? "text-accent" : "text-muted hover:text-foreground"
        }`}
      >
        <span className="flex items-center gap-2">
          {tn(group.labelKey)}
          {/* Collapsed but containing the current route: mark it, or the user
              loses track of where they are. */}
          {hasActive && !expanded ? (
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          ) : null}
        </span>
        {expanded ? (
          <MdExpandMore aria-hidden className="size-4 shrink-0" />
        ) : (
          <MdChevronRight aria-hidden className="size-4 shrink-0" />
        )}
      </button>

      {/* Stays in the DOM and uses the `hidden` attribute rather than being
          conditionally rendered, so `aria-controls` always points at a real
          element. */}
      <ul id={listId} hidden={!expanded} className="mt-1 space-y-1">
        {group.items.map((item) => {
          const active = linkIsActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent-muted text-accent"
                    : "text-muted hover:bg-accent-muted hover:text-foreground"
                }`}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                {navLabel(item)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

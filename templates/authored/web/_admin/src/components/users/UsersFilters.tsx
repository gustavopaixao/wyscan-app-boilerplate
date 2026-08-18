"use client";

/**
 * Search box plus role and status selects.
 *
 * The search input is uncontrolled by the query: it keeps its own state and
 * pushes upward on a debounce, so typing does not fire a request per keystroke
 * and the caret never jumps when a response lands.
 */
import { useEffect, useId, useState } from "react";
import { MdSearch } from "react-icons/md";
import type { UserRole } from "@/lib/admin-access";
import { tu } from "@/lib/i18n/usersStrings";
import {
  USER_ROLES,
  USER_STATUSES,
  type UserStatus,
  type UsersFilter,
} from "@/lib/users/usersQuery";

const SEARCH_DEBOUNCE_MS = 300;

const CONTROL_CLASS =
  "min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

type Props = {
  filter: UsersFilter;
  onChange: (patch: Partial<Omit<UsersFilter, "page">>) => void;
};

export function UsersFilters({ filter, onChange }: Props) {
  const searchId = useId();
  const roleId = useId();
  const statusId = useId();
  const [search, setSearch] = useState(filter.search);

  // Keep the box in step when the filter is reset from outside (Clear filters).
  useEffect(() => {
    setSearch(filter.search);
  }, [filter.search]);

  useEffect(() => {
    if (search === filter.search) return;
    const timer = setTimeout(() => onChange({ search }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, filter.search, onChange]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
        <label
          htmlFor={searchId}
          className="text-sm font-medium text-foreground"
        >
          {tu("users_search_label")}
        </label>
        <div className="relative">
          <MdSearch
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            value={search}
            placeholder={tu("users_search_placeholder")}
            onChange={(event) => setSearch(event.target.value)}
            className={`${CONTROL_CLASS} w-full pl-10`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={roleId} className="text-sm font-medium text-foreground">
          {tu("users_filter_role_label")}
        </label>
        <select
          id={roleId}
          value={filter.role}
          onChange={(event) =>
            onChange({ role: event.target.value as UserRole | "" })
          }
          className={CONTROL_CLASS}
        >
          <option value="">{tu("users_filter_any_role")}</option>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {tu(`users_role_${role}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={statusId}
          className="text-sm font-medium text-foreground"
        >
          {tu("users_filter_status_label")}
        </label>
        <select
          id={statusId}
          value={filter.status}
          onChange={(event) =>
            onChange({ status: event.target.value as UserStatus | "" })
          }
          className={CONTROL_CLASS}
        >
          <option value="">{tu("users_filter_any_status")}</option>
          {USER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {tu(`users_status_${status}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

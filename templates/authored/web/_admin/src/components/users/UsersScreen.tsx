"use client";

/**
 * Owns the filter state for the directory and wires it to the query.
 *
 * Filter state lives here rather than in the URL: the console has no
 * deep-linking story yet, and putting it in the URL would mean reconciling
 * `useSearchParams` with the debounce on every keystroke. Lift it to the URL
 * when someone needs to share a filtered view.
 */
import { useCallback, useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { tu } from "@/lib/i18n/usersStrings";
import {
  EMPTY_USERS_FILTER,
  type UsersFilter,
  withFilter,
} from "@/lib/users/usersQuery";
import { UsersFilters } from "./UsersFilters";
import { UsersPagination } from "./UsersPagination";
import { UsersTable } from "./UsersTable";

function isFiltered(filter: UsersFilter): boolean {
  return Boolean(filter.search.trim() || filter.role || filter.status);
}

export function UsersScreen() {
  const [filter, setFilter] = useState<UsersFilter>(EMPTY_USERS_FILTER);
  const { data, isPending, isError, refetch } = useUsers(filter);

  const handleFilterChange = useCallback(
    (patch: Partial<Omit<UsersFilter, "page">>) => {
      setFilter((current) => withFilter(current, patch));
    },
    [],
  );

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-danger/40 bg-danger/10 p-12 text-center">
        <p role="alert" className="text-sm text-danger">
          {tu("users_error")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="min-h-[44px] rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {tu("users_retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <UsersFilters filter={filter} onChange={handleFilterChange} />

      <UsersTable
        users={data?.users ?? []}
        isLoading={isPending}
        isFiltered={isFiltered(filter)}
      />

      {data && data.total > 0 ? (
        <UsersPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={(page) =>
            setFilter((current) => ({ ...current, page }))
          }
        />
      ) : null}
    </div>
  );
}

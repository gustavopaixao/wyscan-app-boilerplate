"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/admin-client";
import {
  buildUsersQuery,
  type UsersFilter,
  type UsersPage,
} from "@/lib/users/usersQuery";

/**
 * The user directory for one filter.
 *
 * `keepPreviousData` matters more than it looks: without it the table unmounts
 * on every page change and the layout jumps to the empty state and back, which
 * reads as a bug rather than as loading.
 */
export function useUsers(filter: UsersFilter) {
  const query = buildUsersQuery(filter);

  return useQuery({
    // The querystring, not the filter object — two filters that mean the same
    // thing then share a cache entry.
    queryKey: ["admin", "users", query],
    queryFn: ({ signal }) =>
      adminFetch<UsersPage>(`/admin/users?${query}`, { signal }),
    placeholderData: keepPreviousData,
    // A revoked session is handled by a redirect, not by four more attempts.
    retry: false,
  });
}

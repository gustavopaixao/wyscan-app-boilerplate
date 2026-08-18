/**
 * Everything about the user directory that is pure: the wire types, the filter
 * shape, and the querystring builder.
 *
 * Split out from the hook so the URL contract can be unit-tested without React,
 * TanStack Query or a server — a mismatch between this and
 * `api/src/v1/adminUsersRoutes.ts` is the failure this file exists to make loud.
 */
import type { UserRole } from "@/lib/admin-access";

export type UserStatus = "pending" | "active" | "deleted" | "blocked";

/** Mirrors `toPublicJSON()` on the API's user model. */
export type AdminUserSummary = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  city: string | null;
  country: string | null;
  photoUrl: string | null;
  /** ISO-8601, or null for documents written before the field existed. */
  createdAt: string | null;
};

export type UsersPage = {
  users: AdminUserSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** `""` means "no filter" — it is also the value of the placeholder `<option>`. */
export type UsersFilter = {
  page: number;
  search: string;
  role: UserRole | "";
  status: UserStatus | "";
};

/** Must stay within the API's own `MAX_LIMIT` of 100. */
export const USERS_PAGE_SIZE = 20;

export const USER_ROLES: UserRole[] = ["user", "moderator", "admin"];
export const USER_STATUSES: UserStatus[] = [
  "pending",
  "active",
  "blocked",
  "deleted",
];

export const EMPTY_USERS_FILTER: UsersFilter = {
  page: 1,
  search: "",
  role: "",
  status: "",
};

/**
 * Empty values are omitted rather than sent blank, so two filters that mean the
 * same thing produce the same string — and therefore the same query cache key.
 */
export function buildUsersQuery(filter: UsersFilter): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, filter.page)));
  params.set("limit", String(USERS_PAGE_SIZE));

  const search = filter.search.trim();
  if (search) params.set("search", search);
  if (filter.role) params.set("role", filter.role);
  if (filter.status) params.set("status", filter.status);

  return params.toString();
}

/**
 * Changing what you are looking at always returns you to the first page.
 *
 * Without this, narrowing a 10-page list while on page 7 lands on an empty
 * table that looks like "no users" rather than "no page 7".
 */
export function withFilter(
  filter: UsersFilter,
  patch: Partial<Omit<UsersFilter, "page">>,
): UsersFilter {
  return { ...filter, ...patch, page: 1 };
}

/** `null` and unparseable dates render as a dash rather than "Invalid Date". */
export function formatJoined(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

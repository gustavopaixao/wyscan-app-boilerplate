/**
 * User-directory copy for the admin console.
 *
 * A separate table rather than an addition to `lib/i18n/strings.ts`: that file
 * is machine-extracted into `templates/tree/`, so anything added there is wiped
 * by the next re-sync. Same EN-only policy as `navStrings.ts` — the console
 * ships without next-intl, but no surface hard-codes copy inline.
 */
export const usersStrings = {
  users_title: "Users",
  users_description: "Everyone who has an account in this project.",

  users_search_label: "Search users",
  users_search_placeholder: "Search by name or email",
  users_filter_role_label: "Role",
  users_filter_status_label: "Status",
  users_filter_any_role: "Any role",
  users_filter_any_status: "Any status",
  users_clear_filters: "Clear filters",

  users_column_name: "Name",
  users_column_email: "Email",
  users_column_role: "Role",
  users_column_status: "Status",
  users_column_joined: "Joined",

  users_role_user: "User",
  users_role_moderator: "Moderator",
  users_role_admin: "Admin",

  users_status_pending: "Pending",
  users_status_active: "Active",
  users_status_blocked: "Blocked",
  users_status_deleted: "Deleted",

  users_loading: "Loading users…",
  users_empty: "No users yet.",
  users_empty_filtered: "No users match these filters.",
  users_error: "Could not load users. Please try again.",
  users_retry: "Retry",

  users_previous_page: "Previous",
  users_next_page: "Next",
  users_page_status: "Page {page} of {totalPages}",
  users_total: "{total} total",
} as const;

export type UsersStringKey = keyof typeof usersStrings;

/**
 * `{placeholder}` interpolation, so the page and total strings stay single
 * entries rather than being concatenated at the call site.
 */
export function tu(
  key: UsersStringKey,
  values?: Record<string, string | number>,
): string {
  const template: string = usersStrings[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in values ? String(values[name]) : match,
  );
}

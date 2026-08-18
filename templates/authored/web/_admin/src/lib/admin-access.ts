/**
 * Who may use the admin app.
 *
 * `moderator` is deliberately NOT enough. The API grants moderators a subset of
 * privileged routes, but this console is an admin tool; widening it is a
 * decision to make here, in one place, rather than per route.
 */

export type UserRole = "user" | "moderator" | "admin";

export const ADMIN_ACCESS_REQUIRED = "Admin access required.";

export function isAppAdminRole(role: unknown): role is "admin" {
  return role === "admin";
}

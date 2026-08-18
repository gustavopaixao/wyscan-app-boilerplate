/**
 * Navigation copy for the admin console.
 *
 * Separate from `authStrings.ts` for the same reason the mobile app splits them:
 * these label the shell, not the sign-in flow. The admin console is
 * intentionally EN-only, but the labels still live behind keys so no surface
 * hard-codes copy inline.
 */
export const navStrings = {
  nav_menu: "Menu",
  nav_open_menu: "Open menu",
  nav_close_menu: "Close menu",
  nav_toggle_sidebar: "Toggle sidebar",
  nav_sign_out: "Sign out",
  nav_account: "Account",

  nav_dashboard: "Dashboard",
  nav_group_management: "Management",
  nav_users: "Users",
  nav_group_system: "System",
  nav_settings: "Settings",
  nav_logs: "Logs",
} as const;

export type NavStringKey = keyof typeof navStrings;

export function tn(key: NavStringKey): string {
  return navStrings[key];
}

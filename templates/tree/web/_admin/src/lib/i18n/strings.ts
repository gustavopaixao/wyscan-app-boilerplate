/**
 * Admin UI strings (feature 0001). The admin app is intentionally EN-only
 * (mirrors the reference implementation, which ships without next-intl), but all
 * labels still live behind keys so surfaces never hard-code copy inline.
 */
export const adminStrings = {
  admin_dashboard_title: "__PROJECT_NAME__ Admin",
  admin_dashboard_placeholder: "Dashboard shell — features land here.",
} as const;

export type AdminStringKey = keyof typeof adminStrings;

export function t(key: AdminStringKey): string {
  return adminStrings[key];
}

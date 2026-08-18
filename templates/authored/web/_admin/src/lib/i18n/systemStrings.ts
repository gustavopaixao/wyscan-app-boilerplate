/**
 * System-overview copy for the admin console. EN-only, like the rest of the
 * console; see `navStrings.ts` for why these tables are hand-written here.
 */
export const systemStrings = {
  system_title: "Settings",
  system_description:
    "What this deployment is running, and what is switched on.",

  system_section_api: "System",
  system_api_version: "API version",
  system_environment: "Environment",
  system_uptime: "Uptime",

  system_section_infra: "Infrastructure",
  system_infra_mongodb: "MongoDB",
  system_infra_redis: "Redis",
  system_infra_logagent: "Log agent",

  system_section_integrations: "Integrations",
  system_integration_mailer: "Transactional email",
  system_integration_push: "Push notifications",
  system_integration_googleoauth: "Google sign-in",
  system_integration_appleoauth: "Apple sign-in",
  system_integration_facebookoauth: "Facebook sign-in",
  system_integration_internalapi: "Internal API secret",
  system_integration_logviewer: "Log viewer",
  system_integration_corsorigin: "CORS origins",

  system_section_account: "Signed in as",

  system_status_ok: "OK",
  system_status_down: "Down",
  system_status_skipped: "Not configured",
  system_configured: "Configured",
  system_not_configured: "Not configured",

  system_degraded: "Something this project depends on is not responding.",
  system_secrets_note:
    "Values are never shown here — only whether a setting is present.",

  system_loading: "Loading system status…",
  system_error: "Could not load system status. Please try again.",
  system_retry: "Retry",
  system_refresh: "Refresh",
} as const;

export type SystemStringKey = keyof typeof systemStrings;

export function ts(key: SystemStringKey): string {
  return systemStrings[key];
}

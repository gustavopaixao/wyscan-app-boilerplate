/**
 * Log-viewer copy for the admin console. EN-only, like the rest of the console.
 */
export const logsStrings = {
  logs_title: "Logs",
  logs_description: "Recent output from this project's containers.",

  logs_service_label: "Service",
  logs_tail_label: "Lines",
  logs_auto_refresh: "Auto-refresh",
  logs_refresh: "Refresh",
  logs_service_api: "API",
  logs_service_realtime: "Realtime",

  logs_loading: "Loading logs…",
  logs_empty: "No log lines yet.",
  logs_retry: "Retry",
  logs_redaction_note:
    "Credential-shaped values are redacted before they leave the server.",

  // Each failure tells the operator what to actually do about it.
  logs_error: "Could not load logs. Please try again.",
  logs_error_disabled:
    "The log viewer is switched off. Set LOG_VIEWER_ENABLED=true on the API and restart it.",
  logs_error_agent:
    "The log agent is not reachable. Check that the log-agent container is running.",
  logs_error_socket:
    "The log agent cannot read the Docker socket. Check the /var/run/docker.sock mount.",
  logs_error_container:
    "That container is not running, so it has no logs to show.",
  logs_error_unknown_service:
    "No log container is configured for that service.",
} as const;

export type LogsStringKey = keyof typeof logsStrings;

export function tl(key: LogsStringKey): string {
  return logsStrings[key];
}

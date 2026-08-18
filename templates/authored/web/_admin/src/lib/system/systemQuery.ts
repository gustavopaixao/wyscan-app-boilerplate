/**
 * Wire types for the system overview, plus the formatting the page needs.
 *
 * Mirrors `api/src/v1/admin/system.ts`. Nothing here is a secret by
 * construction — the API sends booleans for integrations, never values.
 */

/** Matches `InfraStatus` in `api/src/v1/shared/infraStatus.ts`. */
export type InfraStatus = "ok" | "down" | "skipped";

export type InfraRow = { key: string; status: InfraStatus };
export type IntegrationRow = { key: string; configured: boolean };

export type SystemOverview = {
  api: { version: string; environment: string; uptimeSeconds: number };
  infrastructure: InfraRow[];
  integrations: IntegrationRow[];
};

/** Compact and human: "2h 14m", "3d 4h", "45s". */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
}

/**
 * `skipped` is deliberately not a warning colour: an unconfigured Redis in a
 * fresh project is expected, and painting it red teaches operators to ignore
 * the page.
 */
export function statusTone(status: InfraStatus): "ok" | "bad" | "muted" {
  if (status === "ok") return "ok";
  if (status === "down") return "bad";
  return "muted";
}

/** A deployment is only healthy if nothing it actually configured is down. */
export function hasDegradedInfra(rows: InfraRow[]): boolean {
  return rows.some((row) => row.status === "down");
}

/**
 * Wire types and the querystring for the log viewer.
 *
 * Mirrors `api/src/v1/admin/logs.ts`; kept pure so the URL contract can be
 * tested without React or a server.
 */

export type LogStream = "stdout" | "stderr";

export type LogLine = {
  timestamp?: string;
  stream: LogStream;
  message: string;
};

export type LogsPage = {
  service: string;
  container: string;
  /** What this deployment can offer, so the picker reflects the server. */
  services: string[];
  lines: LogLine[];
};

export type LogsFilter = {
  service: string;
  tail: number;
};

/** Must stay within the API's own MAX_TAIL of 1000. */
export const TAIL_SIZES = [100, 200, 500, 1000] as const;
export const DEFAULT_TAIL = 200;

/** Slow enough not to hammer the Docker socket, fast enough to feel live. */
export const AUTO_REFRESH_MS = 5_000;

export const EMPTY_LOGS_FILTER: LogsFilter = {
  // Empty means "whatever the server offers first" — the console does not
  // presume which services a given deployment runs.
  service: "",
  tail: DEFAULT_TAIL,
};

export function buildLogsQuery(filter: LogsFilter): string {
  const params = new URLSearchParams();
  if (filter.service) params.set("service", filter.service);
  params.set("tail", String(filter.tail));
  return params.toString();
}

/** Docker's RFC3339 timestamps carry nanoseconds; a log reader wants clock time. */
export function formatLogTime(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

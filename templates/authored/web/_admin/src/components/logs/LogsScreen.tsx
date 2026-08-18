"use client";

/**
 * The log viewer.
 *
 * The interesting part is the failure copy: a log page that says "something
 * went wrong" is useless, because every reason it fails is a thing the operator
 * can fix. Each API code maps to the specific instruction instead.
 */
import { useCallback, useState } from "react";
import { useLogs } from "@/hooks/useLogs";
import { AdminApiError } from "@/lib/api/admin-client";
import { type LogsStringKey, tl } from "@/lib/i18n/logsStrings";
import { EMPTY_LOGS_FILTER, type LogsFilter } from "@/lib/logs/logsQuery";
import { LogToolbar } from "./LogToolbar";
import { LogViewer } from "./LogViewer";

/** Every one of these tells the operator what to change, not just that it broke. */
const MESSAGE_BY_CODE: Record<string, LogsStringKey> = {
  NOT_FOUND: "logs_error_disabled",
  LOG_AGENT_UNAVAILABLE: "logs_error_agent",
  DOCKER_SOCKET_DENIED: "logs_error_socket",
  SERVICE_NOT_CONTAINERIZED: "logs_error_container",
  UNKNOWN_SERVICE: "logs_error_unknown_service",
};

export function toLogsMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    const key = error.code ? MESSAGE_BY_CODE[error.code] : undefined;
    if (key) return tl(key);
    // The viewer is disabled path answers 404 without a code of its own.
    if (error.status === 404) return tl("logs_error_disabled");
  }
  return tl("logs_error");
}

export function LogsScreen() {
  const [filter, setFilter] = useState<LogsFilter>(EMPTY_LOGS_FILTER);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { data, isPending, isError, error, refetch, isFetching } = useLogs(
    filter,
    autoRefresh,
  );

  const handleChange = useCallback((patch: Partial<LogsFilter>) => {
    setFilter((current) => ({ ...current, ...patch }));
  }, []);

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-danger/40 bg-danger/10 p-12 text-center">
        <p role="alert" className="max-w-prose text-sm text-danger">
          {toLogsMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="min-h-[44px] rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {tl("logs_retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LogToolbar
        filter={{ ...filter, service: data?.service ?? filter.service }}
        services={data?.services ?? []}
        autoRefresh={autoRefresh}
        isFetching={isFetching}
        onChange={handleChange}
        onAutoRefreshChange={setAutoRefresh}
        onRefresh={() => refetch()}
      />

      <LogViewer lines={data?.lines ?? []} isLoading={isPending} />

      <p className="text-xs text-muted">{tl("logs_redaction_note")}</p>
    </div>
  );
}

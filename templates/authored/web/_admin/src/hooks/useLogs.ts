"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/admin-client";
import {
  AUTO_REFRESH_MS,
  buildLogsQuery,
  type LogsFilter,
  type LogsPage,
} from "@/lib/logs/logsQuery";

/**
 * A tail, optionally re-fetched on an interval.
 *
 * Polling rather than a stream: the admin BFF buffers every proxied response as
 * JSON, so SSE cannot pass through it without a second, streaming route. A
 * five-second tail is enough to watch a request land, and it keeps the whole
 * feature on the proxy that already enforces the admin check.
 */
export function useLogs(filter: LogsFilter, autoRefresh: boolean) {
  const query = buildLogsQuery(filter);

  return useQuery({
    queryKey: ["admin", "logs", query],
    queryFn: ({ signal }) =>
      adminFetch<LogsPage>(`/admin/logs?${query}`, { signal }),
    // Keeps the previous tail on screen while the next one loads, so the
    // viewer does not blank out every five seconds.
    placeholderData: keepPreviousData,
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
    // Config errors (viewer off, agent down) do not get better by retrying,
    // and the message tells the operator what to fix.
    retry: false,
  });
}

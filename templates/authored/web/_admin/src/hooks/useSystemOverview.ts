"use client";

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/admin-client";
import type { SystemOverview } from "@/lib/system/systemQuery";

/**
 * Live infra probes, so a cached answer is worse than no answer: the whole
 * point is whether Mongo is up *now*.
 */
export function useSystemOverview() {
  return useQuery({
    queryKey: ["admin", "system"],
    queryFn: ({ signal }) =>
      adminFetch<SystemOverview>("/admin/settings", { signal }),
    staleTime: 0,
    retry: false,
  });
}

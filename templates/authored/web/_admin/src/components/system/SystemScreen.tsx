"use client";

/**
 * The system overview.
 *
 * Read-only by design: this project has no settings store, so the page reports
 * rather than edits. Anything editable would have to invent a persistence
 * concept, which is a product decision and not scaffolding.
 */
import { MdRefresh } from "react-icons/md";
import { useCurrentAdmin } from "@/hooks/useAuth";
import { useSystemOverview } from "@/hooks/useSystemOverview";
import { systemStrings, ts } from "@/lib/i18n/systemStrings";
import { formatUptime, hasDegradedInfra } from "@/lib/system/systemQuery";
import { InfoCard, InfoRow } from "./InfoCard";
import { ConfiguredPill, StatusPill } from "./StatusPill";

/**
 * `mongodb` -> `system_infra_mongodb`.
 *
 * Looked up dynamically rather than switched on, and falling back to the raw
 * key: the API owns this list, so a row it adds later shows up unlabelled
 * instead of crashing the page.
 */
function label(prefix: string, key: string): string {
  const table: Record<string, string> = systemStrings;
  return table[`${prefix}${key.toLowerCase()}`] ?? key;
}

export function SystemScreen() {
  const { data, isPending, isError, refetch, isFetching } = useSystemOverview();
  const admin = useCurrentAdmin();

  if (isPending) {
    return (
      <p className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        {ts("system_loading")}
      </p>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-danger/40 bg-danger/10 p-12 text-center">
        <p role="alert" className="text-sm text-danger">
          {ts("system_error")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="min-h-[44px] rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {ts("system_retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasDegradedInfra(data.infrastructure) ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {ts("system_degraded")}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          <MdRefresh className="size-4" aria-hidden />
          {ts("system_refresh")}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title={ts("system_section_api")}>
          <InfoRow label={ts("system_api_version")}>{data.api.version}</InfoRow>
          <InfoRow label={ts("system_environment")}>
            {data.api.environment}
          </InfoRow>
          <InfoRow label={ts("system_uptime")}>
            {formatUptime(data.api.uptimeSeconds)}
          </InfoRow>
        </InfoCard>

        <InfoCard title={ts("system_section_infra")}>
          {data.infrastructure.map((row) => (
            <InfoRow key={row.key} label={label("system_infra_", row.key)}>
              <StatusPill status={row.status} />
            </InfoRow>
          ))}
        </InfoCard>

        <InfoCard
          title={ts("system_section_integrations")}
          footnote={ts("system_secrets_note")}
        >
          {data.integrations.map((row) => (
            <InfoRow
              key={row.key}
              label={label("system_integration_", row.key)}
            >
              <ConfiguredPill configured={row.configured} />
            </InfoRow>
          ))}
        </InfoCard>

        {admin ? (
          <InfoCard title={ts("system_section_account")}>
            <InfoRow label={admin.displayName}>{admin.email}</InfoRow>
          </InfoCard>
        ) : null}
      </div>
    </div>
  );
}

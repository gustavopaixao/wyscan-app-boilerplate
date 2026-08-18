"use client";

/**
 * Service picker, tail size, auto-refresh and a manual refresh.
 *
 * The service list comes from the API rather than being hard-coded: which
 * containers exist is a deployment fact, and a picker offering `realtime` in a
 * project that does not run it would just produce errors.
 */
import { useId } from "react";
import { MdRefresh } from "react-icons/md";
import { tl } from "@/lib/i18n/logsStrings";
import { type LogsFilter, TAIL_SIZES } from "@/lib/logs/logsQuery";

const CONTROL_CLASS =
  "min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

/** Falls back to the raw name, so a service added later is still selectable. */
function serviceLabel(service: string): string {
  if (service === "api") return tl("logs_service_api");
  if (service === "realtime") return tl("logs_service_realtime");
  return service;
}

type Props = {
  filter: LogsFilter;
  services: string[];
  autoRefresh: boolean;
  isFetching: boolean;
  onChange: (patch: Partial<LogsFilter>) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => void;
};

export function LogToolbar({
  filter,
  services,
  autoRefresh,
  isFetching,
  onChange,
  onAutoRefreshChange,
  onRefresh,
}: Props) {
  const serviceId = useId();
  const tailId = useId();
  const autoId = useId();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={serviceId}
          className="text-sm font-medium text-foreground"
        >
          {tl("logs_service_label")}
        </label>
        <select
          id={serviceId}
          value={filter.service}
          disabled={services.length === 0}
          onChange={(event) => onChange({ service: event.target.value })}
          className={CONTROL_CLASS}
        >
          {services.map((service) => (
            <option key={service} value={service}>
              {serviceLabel(service)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={tailId} className="text-sm font-medium text-foreground">
          {tl("logs_tail_label")}
        </label>
        <select
          id={tailId}
          value={filter.tail}
          onChange={(event) => onChange({ tail: Number(event.target.value) })}
          className={CONTROL_CLASS}
        >
          {TAIL_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <label
        htmlFor={autoId}
        className="flex min-h-[44px] items-center gap-2 text-sm text-foreground"
      >
        <input
          id={autoId}
          type="checkbox"
          checked={autoRefresh}
          onChange={(event) => onAutoRefreshChange(event.target.checked)}
          className="size-4 accent-accent"
        />
        {tl("logs_auto_refresh")}
      </label>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isFetching}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
      >
        <MdRefresh className="size-4" aria-hidden />
        {tl("logs_refresh")}
      </button>
    </div>
  );
}

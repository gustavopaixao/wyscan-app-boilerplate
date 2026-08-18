/**
 * Infra and integration status, as a dot plus a word.
 *
 * Never colour alone: "ok" and "down" have to be distinguishable without colour
 * vision, so the label is always rendered beside the dot.
 */
import { ts } from "@/lib/i18n/systemStrings";
import { type InfraStatus, statusTone } from "@/lib/system/systemQuery";

const DOT_CLASS = {
  ok: "bg-success",
  bad: "bg-danger",
  muted: "bg-muted",
} as const;

const TEXT_CLASS = {
  ok: "text-success",
  bad: "text-danger",
  muted: "text-muted",
} as const;

export function StatusPill({ status }: { status: InfraStatus }) {
  const tone = statusTone(status);
  const label =
    status === "ok"
      ? ts("system_status_ok")
      : status === "down"
        ? ts("system_status_down")
        : ts("system_status_skipped");

  return (
    <span
      className={`inline-flex items-center gap-2 text-sm ${TEXT_CLASS[tone]}`}
    >
      <span className={`size-2 rounded-full ${DOT_CLASS[tone]}`} aria-hidden />
      {label}
    </span>
  );
}

export function ConfiguredPill({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm ${configured ? "text-success" : "text-muted"}`}
    >
      <span
        className={`size-2 rounded-full ${configured ? "bg-success" : "bg-muted"}`}
        aria-hidden
      />
      {configured ? ts("system_configured") : ts("system_not_configured")}
    </span>
  );
}

/**
 * The log pane.
 *
 * Monospace, newest at the bottom, with stderr called out. The container owns
 * its own scrolling and a fixed height so the toolbar stays put while a long
 * tail scrolls — a page-length log would otherwise push the controls off screen
 * exactly when you want them.
 */
import { tl } from "@/lib/i18n/logsStrings";
import { formatLogTime, type LogLine } from "@/lib/logs/logsQuery";

export function LogViewer({
  lines,
  isLoading,
}: {
  lines: LogLine[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <p className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        {tl("logs_loading")}
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        {tl("logs_empty")}
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-border bg-card p-3 max-h-[60vh]">
      <ol className="min-w-max font-mono text-xs leading-relaxed">
        {lines.map((line, index) => (
          <li
            // Log lines are not unique and have no id; position within one
            // fetched tail is the only stable key available.
            key={`${line.timestamp ?? ""}-${index}`}
            className="flex gap-3 whitespace-pre"
          >
            <span className="shrink-0 text-muted">
              {formatLogTime(line.timestamp)}
            </span>
            <span
              className={
                line.stream === "stderr" ? "text-danger" : "text-foreground"
              }
            >
              {line.message}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

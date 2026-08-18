/**
 * A titled card of label/value rows — the whole settings page is these.
 */
import type { ReactNode } from "react";

export function InfoCard({
  title,
  footnote,
  children,
}: {
  title: string;
  footnote?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
        {title}
      </h2>
      <dl className="divide-y divide-border">{children}</dl>
      {footnote ? (
        <p className="border-t border-border px-5 py-3 text-xs text-muted">
          {footnote}
        </p>
      ) : null}
    </section>
  );
}

export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

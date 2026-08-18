/**
 * Page title block.
 *
 * The reference implementation repeats this markup inline on every page; it is a
 * component here so the heading level and spacing cannot drift between surfaces.
 */
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  /** Right-aligned actions, e.g. a "New…" button. */
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

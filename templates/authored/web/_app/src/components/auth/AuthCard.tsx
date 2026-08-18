import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Shared frame for every auth screen, so they line up pixel for pixel. */
export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
      ) : null}
      <div className="mt-6 flex flex-col gap-4">{children}</div>
      {footer ? (
        <div className="mt-6 text-center text-sm text-muted">{footer}</div>
      ) : null}
    </div>
  );
}

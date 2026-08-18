"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  pending?: boolean;
  disabled?: boolean;
};

export function SubmitButton({ children, pending, disabled }: Props) {
  return (
    <button
      type="submit"
      // Disabled while pending so a double-click cannot submit twice — which on
      // register would mean two accounts, and on resend two codes.
      disabled={pending || disabled}
      aria-busy={pending}
      className="w-full rounded-lg bg-foreground px-4 py-2.5 text-base font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

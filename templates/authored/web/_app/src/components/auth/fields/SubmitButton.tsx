"use client";

import type { ReactNode } from "react";
import { PRIMARY_BUTTON_CLASS } from "@/lib/styles/formControlClassName";

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
      className={PRIMARY_BUTTON_CLASS}
    >
      {children}
    </button>
  );
}

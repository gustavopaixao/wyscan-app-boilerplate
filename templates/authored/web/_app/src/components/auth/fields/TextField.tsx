"use client";

import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { AUTH_FORM_CONTROL_CLASS } from "@/lib/styles/formControlClassName";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

/**
 * Labelled input. `useId` rather than a caller-supplied id, so two forms on one
 * page cannot collide their label/input association.
 */
export function TextField({ label, hint, className, ...props }: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={`${AUTH_FORM_CONTROL_CLASS} ${className ?? ""}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

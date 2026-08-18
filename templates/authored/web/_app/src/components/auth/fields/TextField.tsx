"use client";

import type { InputHTMLAttributes } from "react";
import { useId } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

/**
 * Labelled input for the auth forms. `useId` rather than a caller-supplied id
 * so two forms on one page cannot collide their label/input association.
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
        className={`w-full rounded-lg border border-black/10 bg-transparent px-3 py-2.5 text-base outline-none transition focus:border-transparent focus:ring-2 focus:ring-current disabled:opacity-60 dark:border-white/15 ${className ?? ""}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-foreground/60">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

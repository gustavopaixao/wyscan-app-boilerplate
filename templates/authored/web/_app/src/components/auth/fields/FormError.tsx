"use client";

/**
 * `role="alert"` so screen readers announce the failure — an inline error that
 * only changes colour is invisible to anyone not looking at that spot.
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
    >
      {message}
    </p>
  );
}

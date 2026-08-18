"use client";

/**
 * `role="alert"` so screen readers announce the failure — an inline error that
 * only changes colour is invisible to anyone not looking at that exact spot.
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}

import type { z } from "zod";

/**
 * Returns the first Zod issue message, suitable for a single-line
 * user-facing error (e.g. `Errors.badRequest(...)`). Falls back to a
 * generic message when the error has no issues.
 */
export function formatZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}

/**
 * Returns every Zod issue message joined with "; ". Use when surfacing
 * all validation problems at once rather than just the first.
 */
export function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

import { z } from "zod";

export const isoDateTimeSchema = z
  .string()
  .trim()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid datetime" });

export const optionalIsoDateTimeSchema = z
  .union([isoDateTimeSchema, z.null()])
  .optional();

export function parseIsoDateTime(value: string): Date {
  return new Date(value);
}

export function parseOptionalIsoDateTime(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseIsoDateTime(value);
}

/** Authoritative prediction edit lock (server clock). */
export function predictionLocked(
  gameLockTime: Date,
  processedAt: Date | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (processedAt) return true;
  return nowMs >= gameLockTime.getTime();
}

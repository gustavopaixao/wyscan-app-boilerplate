/**
 * Production env checks for the member app BFF.
 * Called from next.config at build time and from deploy-check.
 */
export function assertProductionInternalApiSecret(
  nodeEnv = process.env.NODE_ENV,
  secret = process.env.INTERNAL_API_SECRET,
): void {
  if (nodeEnv !== "production") return;
  if (!secret?.trim()) {
    throw new Error(
      "INTERNAL_API_SECRET is required when NODE_ENV=production (member app BFF client gate).",
    );
  }
}

// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api transactional-email registry.
//
// Resolution order: a sender registered by the app wins; otherwise the fallback
// below runs.
//
// ---------------------------------------------------------------------------
// DEVELOPMENT FALLBACK — the fallback WRITES THE CODE TO THE SERVER LOG instead
// of sending mail. That is what lets a freshly generated project complete
// signup and password reset with no mail provider configured. It is refused
// outright when NODE_ENV=production, because logging a verification code to
// stdout in production hands account takeover to anyone with log access.
//
// Before you deploy: register a real sender in api/src/server.ts —
//   registerTransactionalEmailSenders({ sendVerificationEmail, sendPasswordResetEmail })
// See docs/runbooks/auth.md.
// ---------------------------------------------------------------------------

import { logger } from "__NPM_SCOPE__/core-api/utils/logger";

let registered = {};

export function registerTransactionalEmailSenders(senders) {
  registered = { ...registered, ...senders };
}

function logCode(kind, to, code, displayName) {
  if (process.env.NODE_ENV === "production") {
    logger.error("transactional_email_not_configured", {
      kind,
      to,
      hint: "Register a sender with registerTransactionalEmailSenders() before deploying.",
    });
    return false;
  }

  logger.warn("transactional_email_dev_fallback", {
    kind,
    to,
    displayName,
    code,
    hint: "No mail provider configured — code written to the log. Dev only.",
  });
  return true;
}

const sendPlainVerification = async (to, code, displayName) =>
  logCode("verification", to, code, displayName);

const sendPlainPasswordReset = async (to, code, displayName) =>
  logCode("password-reset", to, code, displayName);

export async function getSendVerificationEmail() {
  return registered.sendVerificationEmail ?? sendPlainVerification;
}

export async function getSendPasswordResetEmail() {
  return registered.sendPasswordResetEmail ?? sendPlainPasswordReset;
}

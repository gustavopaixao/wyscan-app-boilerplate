/**
 * Firebase Admin bootstrap for FCM push (0111).
 *
 * 0038: real pushes must never fire from a non-production environment by
 * accident — a developer copying prod credentials into a local `.env` used to be
 * enough to page real users. Off production (`NODE_ENV !== "production"`),
 * initialization requires the explicit `PUSH_SENDS_ENABLED=1` opt-in; without it
 * FCM stays uninitialized and every send surfaces as `firebase_unconfigured`.
 */

import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import {
  initializeFirebase,
  isFirebaseInitialized,
} from "__NPM_SCOPE__/notify-api/utils/push";
import * as admin from "firebase-admin";
import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";

let bootstrapped = false;

/** Explicit opt-in for real push sends outside production (0038). */
function pushSendsExplicitlyEnabled(): boolean {
  const raw = process.env.PUSH_SENDS_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

export function initFirebaseAdminFromEnv(): void {
  if (bootstrapped || isFirebaseInitialized()) {
    bootstrapped = true;
    return;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    logger.info("Firebase Admin not configured — push send disabled");
    bootstrapped = true;
    return;
  }

  // 0038: credentials present but this is not production — refuse to arm FCM
  // unless explicitly opted in, so a local `.env` can never page real users.
  if (process.env.NODE_ENV !== "production" && !pushSendsExplicitlyEnabled()) {
    logger.info(
      "Firebase Admin disabled off production — set PUSH_SENDS_ENABLED=1 to send real pushes",
    );
    bootstrapped = true;
    return;
  }

  try {
    const serviceAccount = JSON.parse(raw) as ServiceAccount;
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    initializeFirebase(admin);
    logger.info("Firebase Admin initialized for push notifications");
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    bootstrapped = true;
  }
}

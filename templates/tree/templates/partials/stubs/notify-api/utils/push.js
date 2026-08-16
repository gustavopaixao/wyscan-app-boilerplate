// STUB — replace with __NPM_SCOPE__/notify-api when you adopt the shared packages.
// Tracks Firebase Admin initialisation; sending is a no-op until you wire a
// real provider.

let initialized = false;

export function initializeFirebase(_admin) {
  initialized = true;
}

export function isFirebaseInitialized() {
  return initialized;
}

export async function sendPush(_token, _payload) {
  return { success: false, reason: "push stub — no provider configured" };
}

/**
 * One place to react to a 401/403 from any admin fetch.
 *
 * Single-flight: an admin screen typically fires several queries at once, and
 * a revoked session fails all of them. Without the latch each failure would
 * trigger its own sign-out and navigation, producing a redirect storm.
 */
let signingOut = false;

export async function handleUnauthorized(): Promise<void> {
  if (signingOut) return;
  signingOut = true;

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // Ignore: the redirect below is what matters, and middleware will clear
    // the cookies on the next request anyway.
  }

  // `replace`, and a full document load rather than a client navigation, so all
  // in-memory state from the dead session is discarded.
  window.location.replace("/sign-in");
}

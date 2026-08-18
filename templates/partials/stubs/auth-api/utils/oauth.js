// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api OAuth verification.
//
// These functions are the trust boundary for social login: whatever they return
// is treated as a verified identity. Google and Apple ID tokens are verified
// against the provider's JWKS (RS256, issuer + audience); Facebook access tokens
// are introspected, because Facebook does not issue JWTs.

import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

const JWKS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const googleJwks = new JwksClient({
  jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
  cache: true,
  cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
});

const appleJwks = new JwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
});

/** Resolve the provider's signing key for this token's `kid`. */
async function publicKeyFor(client, idToken) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === "string") throw new Error("Invalid token format");
  const kid = decoded.header.kid;
  if (!kid) throw new Error("Token missing key ID");
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

export async function verifyGoogleToken(idToken) {
  try {
    const publicKey = await publicKeyFor(googleJwks, idToken);

    // One project has several client IDs (web, iOS, Android), so GOOGLE_CLIENT_ID
    // is a comma-separated list and the audience is checked by hand below.
    const audiences = (process.env.GOOGLE_CLIENT_ID ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (audiences.length === 0) throw new Error("GOOGLE_CLIENT_ID is not configured");

    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ["RS256"],
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });

    const tokenAudiences = Array.isArray(payload.aud)
      ? payload.aud
      : payload.aud
        ? [payload.aud]
        : [];
    if (!audiences.some((id) => tokenAudiences.includes(id))) {
      logger.warn("Google token audience mismatch", {
        tokenAudiences,
        configuredCount: audiences.length,
      });
      throw new Error("Invalid Google token");
    }

    // An unverified Google email would let someone claim an address they do not
    // own, and the account-linking path below trusts email as an identity.
    if (!payload.email_verified) throw new Error("Google email not verified");

    return {
      providerId: payload.sub,
      email: payload.email,
      displayName: payload.name || payload.given_name || payload.email.split("@")[0],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Google token verification failed", { error: message });
    if (message === "Google email not verified") throw error;
    throw new Error("Invalid Google token");
  }
}

export async function verifyAppleToken(idToken) {
  try {
    const audience = process.env.APPLE_CLIENT_ID?.trim();
    if (!audience) throw new Error("APPLE_CLIENT_ID is not configured");

    const publicKey = await publicKeyFor(appleJwks, idToken);
    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
      audience,
    });

    // "Hide My Email" users have no address on the token; the relay address is
    // stable per (user, app) so it is a usable account key.
    const email = payload.email || `${payload.sub}@privaterelay.appleid.com`;

    return { providerId: payload.sub, email, displayName: email.split("@")[0] };
  } catch (error) {
    logger.error("Apple token verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error("Invalid Apple token");
  }
}

export async function verifyFacebookToken(accessToken) {
  try {
    const appId = process.env.FACEBOOK_APP_ID?.trim();
    const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
    if (!appId || !appSecret) {
      throw new Error("FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are not configured");
    }

    // Introspect FIRST. Calling /me with an unknown token still succeeds — it
    // just describes whoever that token belongs to — so without this check a
    // token minted for ANY other Facebook app would authenticate its bearer
    // here. debug_token is what binds the token to this app.
    const debugUrl = new URL("https://graph.facebook.com/debug_token");
    debugUrl.searchParams.set("input_token", accessToken);
    debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);

    const debugResponse = await fetch(debugUrl);
    if (!debugResponse.ok) throw new Error("Facebook token introspection failed");

    const debug = (await debugResponse.json())?.data;
    if (!debug?.is_valid) throw new Error("Facebook token is not valid");
    if (String(debug.app_id) !== appId) throw new Error("Facebook token was issued for another app");

    const fieldsUrl = new URL("https://graph.facebook.com/v18.0/me");
    fieldsUrl.searchParams.set("fields", "id,email,name,first_name,last_name");
    fieldsUrl.searchParams.set("access_token", accessToken);

    const response = await fetch(fieldsUrl);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || "Facebook API request failed");
    }

    const userData = await response.json();
    if (!userData.id) throw new Error("Facebook user ID not found");

    // Email is absent when the user declined the permission; synthesize a stable
    // placeholder so the account still has a unique key.
    const email = userData.email || `${userData.id}@facebook.com`;
    const displayName =
      userData.name ||
      [userData.first_name, userData.last_name].filter(Boolean).join(" ") ||
      email.split("@")[0];

    return { providerId: userData.id, email, displayName };
  } catch (error) {
    logger.error("Facebook token verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error("Invalid Facebook token");
  }
}

/**
 * Auth surface for /api/v1.
 *
 * Every handler here comes from `__NPM_SCOPE__/auth-api`; this file only maps
 * URLs onto them. Keep it that way — auth logic belongs in the package (or, in
 * standalone mode, in `packages/stubs/auth-api`), so all three shared-package
 * modes behave identically.
 *
 * Handlers return a `Response`, which Hono returns verbatim.
 */
import { POST as applePOST } from "__NPM_SCOPE__/auth-api/routes/auth/apple";
import { POST as facebookPOST } from "__NPM_SCOPE__/auth-api/routes/auth/facebook";
import { POST as forgotPasswordPOST } from "__NPM_SCOPE__/auth-api/routes/auth/forgot-password";
import { POST as googlePOST } from "__NPM_SCOPE__/auth-api/routes/auth/google";
import { POST as loginPOST } from "__NPM_SCOPE__/auth-api/routes/auth/login";
import { POST as logoutPOST } from "__NPM_SCOPE__/auth-api/routes/auth/logout";
import { POST as refreshPOST } from "__NPM_SCOPE__/auth-api/routes/auth/refresh";
import { POST as registerPOST } from "__NPM_SCOPE__/auth-api/routes/auth/register";
import { POST as resendCodePOST } from "__NPM_SCOPE__/auth-api/routes/auth/resend-code";
import { POST as resetPasswordPOST } from "__NPM_SCOPE__/auth-api/routes/auth/reset-password";
import { POST as verifyEmailPOST } from "__NPM_SCOPE__/auth-api/routes/auth/verify-email";
import { DELETE as deleteMeDELETE } from "__NPM_SCOPE__/auth-api/routes/me/delete";
import { GET as profileGET } from "__NPM_SCOPE__/auth-api/routes/me/profile";
import { PATCH as updateProfilePATCH } from "__NPM_SCOPE__/auth-api/routes/me/update";
import type { Hono } from "hono";
import { asNextRequest } from "./nextAdapter.js";

/** `POST /api/v1/auth/<segment>` -> package handler. */
const AUTH_ROUTES = {
  register: registerPOST,
  login: loginPOST,
  logout: logoutPOST,
  refresh: refreshPOST,
  "verify-email": verifyEmailPOST,
  "resend-code": resendCodePOST,
  "forgot-password": forgotPasswordPOST,
  "reset-password": resetPasswordPOST,
  google: googlePOST,
  apple: applePOST,
  facebook: facebookPOST,
} as const;

export function registerV1AuthRoutes(app: Hono): void {
  for (const [segment, handler] of Object.entries(AUTH_ROUTES)) {
    app.post(`/api/v1/auth/${segment}`, (c) =>
      handler(asNextRequest(c.req.raw)),
    );
  }

  app.get("/api/v1/me", (c) => profileGET(asNextRequest(c.req.raw)));
  app.patch("/api/v1/me", (c) => updateProfilePATCH(asNextRequest(c.req.raw)));
  app.delete("/api/v1/me", (c) => deleteMeDELETE(asNextRequest(c.req.raw)));
}

/** Exported for the route-coverage test. */
export const AUTH_ROUTE_SEGMENTS = Object.keys(AUTH_ROUTES);

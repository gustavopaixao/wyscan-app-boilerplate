/**
 * Server-side admin check for the BFF proxy routes.
 *
 * The API enforces roles on its own admin endpoints, so this is not the only
 * guard — but without it, this app would happily relay a *member's* session to
 * any API route, turning the admin console into an open proxy for anyone who
 * can sign in at all.
 */
import { NextResponse } from "next/server";
import { ADMIN_ACCESS_REQUIRED, isAppAdminRole } from "@/lib/admin-access";
import { upstreamFetch } from "./upstream-api";

export type AdminSession = { userId: string; email: string; role: "admin" };

/** Returns the session, or the response to return verbatim. */
export async function requireAppAdminSession(): Promise<
  AdminSession | NextResponse
> {
  const result = await upstreamFetch("/api/v1/me", { authenticated: true });

  if (result.status === 401) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }
  if (result.status >= 400) {
    return NextResponse.json(
      { message: "Could not verify session." },
      { status: result.status },
    );
  }

  const user = (
    result.body as { user?: { id?: string; email?: string; role?: unknown } }
  )?.user;
  if (!isAppAdminRole(user?.role)) {
    return NextResponse.json(
      { message: ADMIN_ACCESS_REQUIRED },
      { status: 403 },
    );
  }

  return {
    userId: String(user?.id),
    email: String(user?.email),
    role: "admin",
  };
}

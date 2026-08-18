# Authentication

__PROJECT_NAME__ ships with working authentication out of the box: sign in,
sign up, sign out, email verification, forgot/reset password, and Google, Apple
and Facebook OAuth — across the API, the member web app, the admin console and
mobile.

You should be able to sign in **immediately after generating the project**, with
no accounts to create and no credentials to configure — a
[root user](#seeded-root-user) is seeded on the API's first boot. To register a
fresh account instead, read the
[verification codes in development](#verification-codes-in-development) section
before you wonder where the email went.

## How it fits together

| Surface | Where the token lives |
|---|---|
| **API** (`api/`) | Issues and verifies JWTs. The only component that touches the database. |
| **Member app** (`web/__PROJECT_SLUG__-app/`) | **BFF.** Tokens live in `HttpOnly` cookies; the browser never sees a JWT. |
| **Admin** (`web/__PROJECT_SLUG__-admin/`) | Same BFF pattern, separate cookie names, admin role required. |
| **Mobile** (`mobile/`) | Holds the JWTs directly in `expo-secure-store`. |
| **Public site** (`web/__PROJECT_SLUG__-site/`) | No auth. Deliberately. |

Access tokens last **15 minutes**; refresh tokens last **7 days** and are
**rotated** on every use — each refresh issues a new one and revokes the
presented one.

Web clients never handle a JWT. `src/app/api/auth/*` proxies to the API and
stores the tokens in `HttpOnly; SameSite=Strict` cookies, so an XSS bug cannot
read a session. Product calls go through `src/app/api/v1/[...path]`, which
attaches the token server-side and refreshes transparently on a 401.

### Endpoints

All under `/api/v1`, registered by `api/src/v1/authRoutes.ts`:

```
POST /auth/register          -> { requiresVerification, userId, email }
POST /auth/verify-email      -> { accessToken, refreshToken, user }
POST /auth/resend-code
POST /auth/login             -> tokens, or { requiresVerification } if unverified
POST /auth/logout            (send { allDevices: true } to end every session)
POST /auth/refresh           -> rotated tokens
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/google | /auth/apple | /auth/facebook
GET|PATCH|DELETE /me
```

Plus one admin-only endpoint, registered by `api/src/v1/adminRoutes.ts`:

```
GET  /admin/users            -> { users, page, limit, total, totalPages }
```

## Where the implementation lives

This depends on the shared-package mode the project was generated with
(`--wyscan`):

- **`local` / `registry`** — the real `__NPM_SCOPE__/auth-api` package.
- **`standalone`** (the default) — `packages/stubs/auth-api/`, a complete local
  implementation with the same subpath exports and the same request/response
  contracts, with one documented exception — see below.

The import specifiers in `api/src/v1/authRoutes.ts` are **identical** in all
three modes, so moving between them is a dependency swap, not a rewrite.

If you generated in `standalone` and later adopt the shared packages, delete
`packages/stubs/auth-api` and point the dependency at the published package.
No application code changes.

### Where the stub is narrower than the package

The stub matches the package on the **user payload** — `toPublicJSON()` returns
the same fields in both. It is not a field-for-field copy of the stored
documents, and `user.location` is the one place that matters today:

| | stub | package |
|---|---|---|
| `location.city` | ✅ | ✅ |
| `location.country` | ✅ | ✅ |
| `location.coordinates` | — | GeoJSON `Point`, `[longitude, latitude]` |
| `location.precision` | — | `EXACT` / `CITY` / `COUNTRY` / `HIDDEN` |
| `location.source` | — | `GPS` / `MANUAL` / `IP` |
| `location.updatedAt` | — | `Date` |

`toPublicJSON()` only ever flattens `city` and `country`, so this is invisible
over the wire and no client can tell the two apart.

**The trap is that writing the extra fields in `standalone` does not fail.**
Mongoose strips unknown paths on save, so this succeeds and silently stores
only `city` and `country`:

```js
await User.create({
  email, passwordHash, displayName,
  location: { city: "Lisbon", country: "PT",
              coordinates: { type: "Point", coordinates: [-9.14, 38.72] } },
});
// stored: { city: "Lisbon", country: "PT" } — the coordinates are gone, no error
```

So a geospatial feature developed against `local` loses its data the moment
someone generates in `standalone`, with nothing in the logs. If you need those
fields, either widen `packages/stubs/auth-api/models/user.model.js` to match
(it is yours to edit) or commit to the shared package. The same applies to
`LocationPrecision` and `LocationSource`, which the package exports from
`__NPM_SCOPE__/auth-api/models` and the stub does not — importing them
type-checks in `local` and fails to resolve in `standalone`.

Nothing shipped reads or writes `location`, including the
[root user seed](#seeded-root-user), so today the divergence costs nothing.

#### `GET /api/v1/me` returns two different envelopes

The **routes** are not identical either, and this one bites:

```js
// shared package (local / registry)     // standalone stub
{ id, email, role, … }                   { user: { id, email, role, … } }
```

A client that reads only `body.user` gets `undefined` for the role against the
package — and `undefined` is indistinguishable from "not an admin", so the admin
session route answers 403 and clears the cookies. The symptom is being **signed
out a second after a successful sign-in**, in `local` and `registry` only.

Every shipped consumer therefore reads it tolerantly rather than assuming a
shape — `readMeUser()` in each web app's `lib/server/upstream-api.ts`, and an
inline check in `mobile/lib/auth/authApi.ts`. **Any new caller of `/api/v1/me`
must do the same**; a test fails if one reads `body.user` directly.

## Seeded root user

**A root user is created automatically the first time the API connects to
MongoDB** — no command to run, nothing to configure:

| | |
|---|---|
| email | `root@wyscan.local` |
| password | `Password@1` |
| role | `admin` |
| status | `active` |

It is created `active` rather than `pending`, so it skips the verification-code
exchange below and can sign in immediately, and `admin` so it can open the admin
console. Sign in at `web/__PROJECT_SLUG__-admin` (`make admin-dev`) or in the
member app and mobile client with the same credentials.

Seeding is idempotent — a restart never creates a second user and logs nothing.
It runs again after `make fresh`, which drops the database volume. Look for it
once, on first boot:

```
[info] root_user_seeded {"email":"root@wyscan.local"}
```

**It is skipped entirely when `NODE_ENV=production`**, for the same reason the
dev mail fallback is: these credentials are published in this file, so they must
never reach a real database. Change the password or delete the account before
exposing an environment anywhere else either — a staging box is reachable too.

The implementation is `api/src/lib/seedRootUser.ts`, called from
`api/src/server.ts` right after `mongoose.connect()`. Editing the constants
there changes the seeded account; deleting the call disables seeding.

## Verification codes in development

**With no mail provider configured, the API writes the verification and
password-reset codes to its own log instead of sending them.** That is what
makes signup completable on a fresh clone.

```
make api-dev
# register, then read the code from the log:
#   [warn] transactional_email_dev_fallback {"kind":"verification","code":"VCAV1ZD1",...}
```

This is **refused when `NODE_ENV=production`** — the request fails rather than
writing a credential to a production log.

### Wiring a real mailer

Register a sender at boot, in `api/src/server.ts`:

```ts
import { registerTransactionalEmailSenders } from "__NPM_SCOPE__/auth-api/utils/transactional-email";

registerTransactionalEmailSenders({
  sendVerificationEmail: async (to, code, displayName) => { /* ... */ return true; },
  sendPasswordResetEmail: async (to, code, displayName) => { /* ... */ return true; },
});
```

Return `true` on success. Returning `false` is logged and the account is still
created — the user can request a new code rather than being stranded.

## Environment

### `api/.env`

| Variable | Required | Notes |
|---|---|---|
| `JWT_SECRET` | **yes in production** | `openssl rand -base64 48`. The API refuses to sign without it outside tests. |
| `MONGODB_URL` | yes | Auth needs the `users` and `auth_tokens` collections. |
| `REDIS_URL` | recommended | Without it, rate limits are per-process and reset on restart. |
| `GOOGLE_CLIENT_ID` | for Google | **Comma-separated**: web, iOS, Android and web-app ids all go here. |
| `APPLE_CLIENT_ID` | for Apple | Your app's bundle id. |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | for Facebook | Both required — the secret is used to introspect the token. |
| `INTERNAL_API_CLIENT_ID` / `INTERNAL_API_SECRET` | no | BFF identification. Unset = not required, which is why a fresh project runs. |

### Web apps

Both ship a `.env.example` and a gitignored `.env.local` with a development
placeholder. Set a real `INTERNAL_API_SECRET` in both the app and the API
before exposing either.

### Mobile

See `mobile/.env.example`. Everything there is `EXPO_PUBLIC_*` and therefore
embedded in the app bundle — never put a secret in it.

## Rate limits

`api/src/middleware/authRateLimit.ts`, Redis-backed so the budget is shared
across replicas:

| Bucket | Limit | On Redis failure |
|---|---|---|
| login, register, OAuth | 10/min | **deny** (production) |
| refresh | 30/min | allow |
| forgot-password | 3/hour | **deny** (production) |
| verify-email, reset-password | 10/hour | **deny** (production) |
| resend-code | 5/hour | **deny** (production) |

Credential-guessing buckets fail closed so an outage cannot be used to remove
brute-force protection. `refresh` fails open — it needs a valid signed token
anyway, and locking it would sign everyone out during a Redis blip.
Override with `RATE_LIMIT_FAIL_CLOSED=0|1`.

## Roles

`user` (default), `moderator`, `admin`. The seeded root user is already `admin`,
so there is an admin account from the first boot.

There is no self-service promotion, so **additional** admins are granted
directly:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

The admin console requires `admin` specifically; `moderator` is **not** enough
(`web/__PROJECT_SLUG__-admin/src/lib/admin-access.ts`). Widen it there, in one
place, if you need to.

## Admin: listing users

`GET /api/v1/admin/users` backs the **Users** screen in the admin console
(`web/__PROJECT_SLUG__-admin/src/app/users/page.tsx`). Read-only: it lists,
searches, filters and pages, and changes nothing.

| Parameter | Default | Notes |
|---|---|---|
| `page` | `1` | Clamped to at least 1. |
| `limit` | `20` | Capped at 100, so one request cannot pull the whole table. |
| `search` | — | Case-insensitive, matches email **or** display name. |
| `role` | — | `user`, `moderator`, `admin`. |
| `status` | — | `pending`, `active`, `blocked`, `deleted`. |

An unknown `role` or `status` is ignored rather than rejected — a stale bookmark
shows the unfiltered list instead of an error page. Soft-deleted users are
listed by default; narrow with `?status=` to hide them. Results are newest
first.

Users are serialized with the model's `toPublicJSON()`. That is not a
convenience — it is the only thing keeping `passwordHash` and the OAuth provider
ids out of the response, which is why the query must never use `.lean()`
(`.lean()` returns plain objects and the method disappears).

The console never calls the API directly. It goes through its own BFF proxy
(`src/app/api/v1/[...path]/route.ts`), which attaches the bearer token from the
HttpOnly cookies and re-checks the caller's role on every request, so the
browser never holds a token. `src/lib/api/admin-client.ts` is the one place that
speaks to it.

### Guarding a privileged route

Use `isAuthenticatedUser` from `api/src/v1/routeHelpers.ts`, never
`instanceof Response`:

```ts
const admin = await requireAdminUser(c);
if (!isAuthenticatedUser(admin)) return admin;
```

`requireAdmin` refuses with a `NextResponse`, which extends the `Response`
class that `next/server` was loaded with. `@hono/node-server` installs its
**own** `Response` global over that one, so in the running API the refusal is
not an instance of the ambient `Response` — `instanceof` returns false, the
guard falls through, and the route answers anonymous callers as though they
were admins.

This is worth knowing because of how it fails: it passes every unit test.
Under Vitest there is only one `Response` class, so `instanceof` is true and
the guard looks correct. It only breaks once the route is served by the real
Node server. `isAuthenticatedUser` identifies the *success* case instead, so
anything unrecognisable is treated as a refusal and the route fails closed.
`adminRoutes.test.ts` pins this with a refusal from a deliberately foreign
class.

### Why this route lives in the app, not the package

Every other auth endpoint is re-exported from `__NPM_SCOPE__/auth-api`. This one
is implemented in the API workspace, and that is deliberate: **the shared
package has no user-listing route.** Its `exports` map stops at `routes/auth/*`
and `routes/me/*`.

Adding `__NPM_SCOPE__/auth-api/routes/admin/users` to the stub and importing it
would work in `standalone` and fail to resolve in `local` and `registry` — and
the mode that breaks is never the one you are working in. So the route is built
on the two surfaces the package and the stub genuinely agree on: `requireAdmin`
(via `requireAdminUser` in `api/src/v1/routeHelpers.ts`) and the `User` model.
Built that way, `adminRoutes.ts` is byte-identical in all three modes, and a
test asserts it stays that way.

If the shared package ever grows the endpoint, move the route the same way
everything else moved: swap the implementation for a re-export, and leave the
URL alone.

## Behaviour worth not breaking

These are deliberate, and each looks like a bug until you know why:

- **Login answers identically for an unknown email and a wrong password**, and
  compares against a dummy bcrypt hash when no user exists so the two paths take
  the same time. Account state (`deleted`/`blocked`/`pending`) is only disclosed
  *after* a correct password.
- **Forgot-password always returns the same message**, whether or not the
  address is registered. The client always advances to the reset screen for the
  same reason.
- **Refresh rotates.** A stolen refresh token is usable at most once, and using
  it invalidates the legitimate holder's copy — which is what makes theft
  detectable.
- **Refresh tokens are SHA-256 hashed in the database, not bcrypt.** bcrypt
  silently truncates at 72 bytes, and every refresh JWT for a user shares its
  first 72 bytes, so under bcrypt they all hash identically and revocation
  matches the wrong row. Verification codes *do* use bcrypt — they are short and
  low-entropy.
- **Refresh tokens carry a random `jti`.** Without it, `iat`'s one-second
  granularity means two refreshes in the same second mint identical tokens.
- **Password reset revokes every session**, because whoever prompted it may have
  had the old password.
- **Account deletion is a soft delete** (`status: "deleted"`), so ids referenced
  elsewhere do not dangle and the email stays claimed. Purging is a product
  decision — see `packages/stubs/auth-api/routes/me/delete.js`.

## Related

- OAuth provider setup: [`integrations/oauth-google-apple-facebook.md`](integrations/oauth-google-apple-facebook.md)

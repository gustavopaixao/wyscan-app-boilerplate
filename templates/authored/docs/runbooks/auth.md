# Authentication

__PROJECT_NAME__ ships with working authentication out of the box: sign in,
sign up, sign out, email verification, forgot/reset password, and Google, Apple
and Facebook OAuth — across the API, the member web app, the admin console and
mobile.

You should be able to register and sign in **immediately after generating the
project**, with no accounts to create and no credentials to configure. Read the
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

## Where the implementation lives

This depends on the shared-package mode the project was generated with
(`--wyscan`):

- **`local` / `registry`** — the real `__NPM_SCOPE__/auth-api` package.
- **`standalone`** (the default) — `packages/stubs/auth-api/`, a complete local
  implementation with the same subpath exports and the same wire contracts.

The import specifiers in `api/src/v1/authRoutes.ts` are **identical** in all
three modes, so moving between them is a dependency swap, not a rewrite.

If you generated in `standalone` and later adopt the shared packages, delete
`packages/stubs/auth-api` and point the dependency at the published package.
No application code changes.

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

`user` (default), `moderator`, `admin`. There is no self-service promotion —
grant admin directly:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

The admin console requires `admin` specifically; `moderator` is **not** enough
(`web/__PROJECT_SLUG__-admin/src/lib/admin-access.ts`). Widen it there, in one
place, if you need to.

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

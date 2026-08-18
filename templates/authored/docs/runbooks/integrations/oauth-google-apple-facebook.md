# OAuth: Google, Apple, Facebook

Social sign-in is wired end to end but **off until you supply client IDs**. With
none configured, the buttons do not render at all and email/password sign-in
works normally — so you can ship without OAuth and add it later without touching
application code.

See [`../auth.md`](../auth.md) for the rest of the auth system.

## How it works

The client performs the provider's flow itself and posts the resulting token to
`/api/v1/auth/{google,apple,facebook}`. The API verifies it — Google and Apple
against the provider's JWKS (RS256, issuer and audience checked), Facebook by
introspection — and only then issues a session.

Account resolution, in order: known provider id → an existing account with the
same email (**linked**) → a new account. Linking by email is only safe because
every verifier establishes that the provider vouched for that address; Google
tokens without `email_verified` are rejected for exactly this reason.

OAuth accounts are created `active` — the provider already verified the email,
so our own verification step is skipped.

---

## Google

### 1. Create the client IDs

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
**Credentials** → **Create credentials** → **OAuth client ID**. You need up to
three, all in the **same project**:

| Type | For | Needs |
|---|---|---|
| Web application | the member web app, and the audience mobile tokens are issued to | Authorized origin + redirect URI |
| iOS | the mobile app | Bundle ID `__BUNDLE_ID__` |
| Android | the mobile app | Package name `__BUNDLE_ID__` + SHA-1 fingerprint |

For the **Web** client add:

- Authorized JavaScript origin: `https://__WEB_DOMAIN__` (and
  `http://localhost:4500` for development)
- Authorized redirect URI: `https://__WEB_DOMAIN__/en/oauthredirect`

For the **Android** client you need your signing certificate's SHA-1:

```bash
sh mobile/scripts/android-google-oauth-sha1.sh
```

Register **both** the debug and the release fingerprint, or sign-in works in
development and fails in production.

### 2. Configure

`api/.env` — **comma-separated, every client ID that may appear as an audience**:

```
GOOGLE_CLIENT_ID=<web>.apps.googleusercontent.com,<ios>.apps.googleusercontent.com,<android>.apps.googleusercontent.com
```

Missing one here is the most common failure: sign-in works on one platform and
returns `Invalid Google token` on another.

`web/__PROJECT_SLUG__-app/.env.local`:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<web>.apps.googleusercontent.com
```

`mobile/.env`:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android>.apps.googleusercontent.com
```

### 3. Rebuild the native projects

`mobile/app.config.ts` derives the reversed-client-id URL schemes
(`com.googleusercontent.apps.<id>`) and the Android intent filters from those
variables, so **no manual native editing is needed** — but the values are baked
in at prebuild time:

```bash
cd mobile && npx expo prebuild --clean
```

Skipping this is the second most common failure: the OAuth sheet opens, the user
approves, and nothing comes back, because the OS has no registered handler for
the redirect scheme.

---

## Apple

Requires a **paid Apple Developer account**.

1. In the developer portal, enable the **Sign In with Apple** capability for the
   App ID `__BUNDLE_ID__`.
2. For the **web** app, create a **Services ID** (this is a separate identifier
   from the bundle id) and register the return URL
   `https://__WEB_DOMAIN__/en/oauthredirect`.

Configure:

```
# api/.env — the app's bundle id, which is the audience on native tokens
APPLE_CLIENT_ID=__BUNDLE_ID__

# web/__PROJECT_SLUG__-app/.env.local — the SERVICES ID, not the bundle id
NEXT_PUBLIC_APPLE_CLIENT_ID=<your services id>
NEXT_PUBLIC_APPLE_REDIRECT_URI=https://__WEB_DOMAIN__/en/oauthredirect
```

The web button stays hidden unless **both** variables are set.

Mobile needs no client id: `usesAppleSignIn: true` is already in
`app.config.ts` and the native flow uses the bundle id.

Two Apple-specific behaviours the code already handles:

- **The name is returned only on the first authorization, ever.** Both clients
  forward it on that first call; there is no way to retrieve it later.
- **"Hide My Email"** users have no address on the token. A stable
  `<sub>@privaterelay.appleid.com` address is used as the account key.

---

## Facebook

Server-side only — the API route is wired and tested, but **no client currently
renders a Facebook button**. Adding one is a client-side change; the backend is
ready.

```
# api/.env — both are required
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

The secret is not optional: the token is introspected via `debug_token` to
confirm it was issued for **this** app. Without that check, an access token
minted for any other Facebook app would authenticate its bearer here.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Buttons do not render | No client ID configured. Expected — check the `.env` for that surface. |
| `Invalid Google token` on one platform only | That platform's client ID is missing from the API's comma-separated `GOOGLE_CLIENT_ID`. |
| `Google email not verified` | The Google account's email is unverified. Not a misconfiguration; the API refuses on purpose. |
| Mobile sheet opens, approves, nothing happens | `expo prebuild` not re-run after setting the client IDs. |
| Works in dev, fails on a release build (Android) | The release SHA-1 was never registered on the Android client. |
| Apple button hidden on web | Only one of `NEXT_PUBLIC_APPLE_CLIENT_ID` / `NEXT_PUBLIC_APPLE_REDIRECT_URI` is set. |
| Apple works on iOS, fails on web | The web app must use the **Services ID**, not the bundle id. |

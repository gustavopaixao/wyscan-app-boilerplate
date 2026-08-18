# Admin console

`web/__PROJECT_SLUG__-admin` — the operator-facing app on port 4000. Sign in with
the seeded root user (see `auth.md`); `role === "admin"` exactly is required, and
`moderator` is deliberately not enough.

Every page is read-only. A generated project has no domain model yet, so the
console reports rather than edits; the pages exist to prove the plumbing and to
give the first real feature somewhere obvious to land.

## The pages

| Route | Backed by | What it does |
|---|---|---|
| `/` | — | Placeholder dashboard. |
| `/users` | `GET /api/v1/admin/users` | Paginated, searchable user directory. |
| `/settings` | `GET /api/v1/admin/settings` | System, infrastructure and integration status. |
| `/logs` | `GET /api/v1/admin/logs` | Container logs, via the log-agent sidecar. |

The sidebar is `src/components/layout/navItems.ts`. **Every entry in it must
resolve to a page** — a nav that 404s is worse than a nav that is short, and a
test in the scaffolder fails if one goes dead.

## How the console reaches the API

The browser never holds a token. Every call goes to this app's own BFF proxy at
`src/app/api/v1/[...path]/route.ts`, which reads the HttpOnly cookies, re-checks
the caller's role against `/api/v1/me` on **every** request, and forwards with a
bearer token. `src/lib/api/admin-client.ts` is the only module that speaks to it;
a 401 or 403 routes into the single-flight sign-out in
`src/lib/auth/handle-unauthorized.ts`.

Consequence worth knowing: the proxy buffers each response as JSON with a 10s
timeout, so **it cannot carry a stream**. Anything needing SSE needs its own
route handler beside it.

## `/settings`

Non-secret runtime facts only:

- **System** — API version, `NODE_ENV`, process uptime.
- **Infrastructure** — live probes of Mongo, Redis and the log agent, reusing
  `checkMongo`/`checkRedis` from `api/src/lib/infraHealth.ts`. `skipped` means
  the URL is unset, and is rendered neutrally: an unconfigured Redis in a fresh
  project is expected, and painting it red teaches operators to ignore the page.
- **Integrations** — a boolean per integration, derived from whether its
  environment variable is set.

**No secret value is ever returned.** A settings screen is exactly where a key
gets echoed by accident, and the page is one screenshot away from a chat thread.
The endpoint sends `configured: true|false` and nothing else; a test asserts no
value reaches the payload.

There is no settings *store*. Adding editable platform settings means inventing
persistence, which is a product decision — see the reference implementation if
you want the shape.

## `/logs`

Reads real container logs. Three processes are involved:

```
log-agent            dockerode over /var/run/docker.sock (read-only)
   ^  GET /internal/tail?service=&tail=   [x-log-agent-secret]
api                  GET /api/v1/admin/logs   (admin-gated, redacts)
   ^
admin console        the BFF proxy above
```

**The API never gets the Docker socket**, and must not: a flaw in any product
route would otherwise reach the daemon. Only the sidecar has it, it publishes no
host port, and it is reachable only across the compose network.

### Turning it on

Compose already sets all of this for local development:

| Variable | On | Purpose |
|---|---|---|
| `LOG_VIEWER_ENABLED` | api | Off unless `"true"`; the endpoint 404s when off. |
| `LOG_AGENT_URL` | api | Where the sidecar is. |
| `LOG_AGENT_SECRET` | api + agent | Shared secret; the agent refuses without it. |
| `LOG_CONTAINER_API` / `LOG_CONTAINER_REALTIME` | agent | The allowlist. |

The container allowlist lives **only on the agent**. A caller cannot name a
container: the agent maps a service name through `allowedContainers()` and
rejects anything else, so the sidecar cannot be talked into dumping the logs of
an unrelated container sharing the host daemon. The agent also reports the list
it offers, so the console's picker reflects the deployment rather than a
hard-coded guess.

### Redaction

Log lines are scrubbed by `api/src/v1/admin/redactLogLine.ts` **before the
response is built** — JWTs, `Authorization` values, credentials in connection
strings, and any `key=value` whose name says secret. Application logs are not
written with a browser audience in mind, and a token that reaches the client has
already leaked whatever the UI then does with it. This is a safety net over
careful logging, not a substitute for it.

### It polls, it does not stream

Tail plus an optional five-second refresh, because the BFF proxy cannot carry
SSE (see above). Streaming means adding a second, streaming route handler beside
the proxy and switching the agent to an SSE endpoint.

### When it does not work

Each failure maps to its own message, because each is something you fix:

| Code | Meaning |
|---|---|
| `NOT_FOUND` | `LOG_VIEWER_ENABLED` is not `true` on the API. |
| `LOG_AGENT_UNAVAILABLE` | The sidecar is not running or not reachable. |
| `DOCKER_SOCKET_DENIED` | The socket is not mounted or not readable. |
| `SERVICE_NOT_CONTAINERIZED` | That container exists but is not running. |
| `UNKNOWN_SERVICE` | No `LOG_CONTAINER_*` is set for that name. |

## Adding a page

1. Add the entry to `navItems.ts` and its label to `lib/i18n/navStrings.ts`.
2. Create `src/app/<route>/page.tsx` — thin, a `PageHeader` plus a client screen.
   `AppShell` owns the chrome, so the page adds no min-height and no centring.
3. Fetch through `adminFetch`, never `fetch` to the API directly.
4. Put the endpoint in `api/src/v1/admin/` and register it in that directory's
   `routes.ts`. Guard it with `isAuthenticatedUser`, **not** `instanceof
   Response` — see "Guarding a privileged route" in `auth.md`.

## Related

- `auth.md` — roles, the seeded root user, and the guard rule.
- `design-system.md` — tokens; no component may hard-code a colour.

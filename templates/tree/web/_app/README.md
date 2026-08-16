# __PROJECT_SLUG__-app

__PROJECT_NAME__ member web app (Next.js, port 4500). Scaffolded by feature 0001.

- `pnpm dev` — dev server on http://localhost:4500 (Turbopack)
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` / `pnpm type-check` / `pnpm test`

## Environment (`.env.local`)

Create `web/__PROJECT_SLUG__-app/.env.local` (git-ignored) with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:4500
INTERNAL_API_SECRET=
INTERNAL_API_CLIENT_ID=app-bff
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_APPLE_CLIENT_ID=
NEXT_PUBLIC_APPLE_REDIRECT_URI=
```

`INTERNAL_API_SECRET` is required when `NODE_ENV=production` (BFF client gate).

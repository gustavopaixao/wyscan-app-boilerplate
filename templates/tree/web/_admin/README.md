# __PROJECT_SLUG__-admin

__PROJECT_NAME__ admin app (Next.js, port 4000). Scaffolded by feature 0001.

- `pnpm dev` — dev server on http://localhost:4000 (Turbopack)
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` / `pnpm type-check` / `pnpm test`

EN-only by design (mirrors the reference implementation); UI strings live behind
keys in `src/lib/i18n/strings.ts`.

## Environment (`.env.local`)

Create `web/__PROJECT_SLUG__-admin/.env.local` (git-ignored) with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

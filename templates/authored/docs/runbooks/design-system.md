# Design system

One visual language across the member app, the admin console and mobile. This is
what to read before adding a screen.

## The one rule

**Never hard-code a colour in a component.** Every surface resolves through
tokens. It is the difference between dark mode working everywhere and dark mode
working on the screens someone remembered to check.

## Changing the brand colour

The accent is a neutral blue so a generated project does not ship someone else's
brand. To make it yours, change it in **three** places — they are deliberately
separate files because web and mobile have no shared runtime:

| Surface | File | Tokens |
|---|---|---|
| Member app + site | `web/__PROJECT_SLUG__-app/src/app/globals.css` (and `-site`) | `--accent`, `--accent-hover`, `--accent-muted`, `--on-accent` |
| Admin | `web/__PROJECT_SLUG__-admin/src/app/globals.css` | same |
| Mobile | `mobile/lib/theme/appColors.ts` | `accent`, `accentMuted`, `onAccent` |

**Set `--on-accent` deliberately.** It is the text drawn on top of the accent,
and it is not always white: the default dark accent is a light blue, and white
on it lands near 2.2:1 — under the 4.5:1 AA minimum. Check the pair you choose.

## Web

Tailwind v4, CSS-first. Tokens are declared in each `globals.css` and exposed as
utilities through `@theme inline`.

| Utility | Role |
|---|---|
| `bg-background` / `text-foreground` | page canvas and body text |
| `bg-card` | panels, cards, the sidebar, the header |
| `border-border` | every border and divider |
| `text-muted` | secondary text, inactive nav items |
| `bg-accent` / `text-on-accent` | primary actions |
| `bg-accent-muted` | hover tint, active nav item, icon chips |
| `text-danger` / `text-success` | failure and confirmation |

`bg-card` and `bg-card-bg` are the same value — the second is the older name and
is kept so existing markup does not break. Prefer `bg-card`.

Shared class strings live in
`web/__PROJECT_SLUG__-app/src/lib/styles/formControlClassName.ts`. Use them
rather than re-deriving a control: they carry three things that are easy to get
wrong and invisible until someone uses a phone or a keyboard —

- `min-h-[44px]`, the platform minimum touch target;
- `text-base sm:text-sm`, because iOS Safari zooms on a focused input under 16px
  and never zooms back out;
- a `focus-visible` ring, so a mouse click does not leave a ring behind.

Dark mode is `next-themes` (class strategy) on the member app and the site. The
admin follows the OS instead — it has no theme toggle.

## Mobile

No Tailwind. Resolve colours per component:

```tsx
const c = appColors(resolveScheme(useColorScheme()));
// c.background, c.foreground, c.muted, c.accent, c.onAccent, c.error, …
```

Scales live beside it in `lib/theme`: `typography` (five roles),
`radii` (by role, not by size), `SCREEN_EDGE_PADDING`, `MIN_TOUCH_TARGET`.
Type is the platform system font — load one with `expo-font` and add
`fontFamily` to `typography.ts` if the product needs it.

Primitives are in `components/ui/`: `PrimaryButton`, `SecondaryButton`,
`AuthTextField`, `DividerWithLabel`, `OAuthIconButton`, `ToolbarBackButton`,
`BrandWordmark`. Build screens from these.

## Navigation

- **Mobile** — bottom tabs in `app/(app)/(tabs)/_layout.tsx`, shared toolbar
  `AppMainToolbar`, sign-out in the toolbar's account menu. The inset contract
  is strict; see `.claude/rules/mobile-navigation-toolbar.md`.
- **Admin** — `AppShell` mounts the sidebar and header for every non-public
  route. Edit `components/layout/navItems.ts` to change the nav; nothing else
  needs to change. Sign-out is the icon button in the header.

## Branding

Both wordmarks are typographic, because a generated project has no logo yet:

- Mobile: `components/ui/BrandWordmark.tsx`
- Admin: `components/layout/BrandWordmark.tsx`

Each is the only place its surface names the brand — swap in an `<Image>` there.

## Related

- [`auth.md`](auth.md) — the flows these screens drive

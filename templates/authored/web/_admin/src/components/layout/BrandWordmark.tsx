/**
 * Brand lockup for the sidebar and the sign-in page.
 *
 * Typographic: a freshly generated project has no logo, and a placeholder image
 * would look worse than type. Swap in an `<Image>` here — this is the only place
 * the console names the brand.
 */
const APP_NAME = "__PROJECT_NAME__";

/** Up to two initials, for the collapsed icon rail. */
function initials(): string {
  return APP_NAME.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function BrandWordmark({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      // role="img" so the initials are announced as the brand rather than read
      // out as two stray letters.
      <span
        role="img"
        aria-label={APP_NAME}
        className="flex size-9 items-center justify-center rounded-lg bg-accent-muted text-sm font-bold text-accent"
      >
        {initials()}
      </span>
    );
  }

  return (
    <span className="truncate text-base font-semibold tracking-tight text-foreground">
      {APP_NAME}
    </span>
  );
}

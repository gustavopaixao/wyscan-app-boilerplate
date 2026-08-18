/**
 * Shared class strings for form controls.
 *
 * Centralised so the focus ring, the touch target and the iOS zoom fix are
 * decided once. Every one of these is a rule that is easy to get subtly wrong
 * per-component and invisible until someone uses a phone or a keyboard.
 */

/**
 * `text-base` below `sm` is not a style choice: iOS Safari zooms the viewport
 * when a focused input's font-size is under 16px, and it never zooms back out.
 */
export const FORM_CONTROL_FONT_CLASS = "text-base sm:text-sm";

/** 44px is the platform minimum touch target on both iOS and Android. */
export const MIN_TOUCH_TARGET_CLASS = "min-h-[44px]";

/**
 * The focus ring used by every interactive control in the app. `focus-visible`
 * rather than `focus`, so a mouse click does not leave a ring behind.
 */
export const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const FORM_CONTROL_BASE_CLASS = [
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition",
  "focus:border-accent focus:ring-2 focus:ring-accent/25",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

/** Fields on the auth screens: same contract, card background, softer corners. */
export const AUTH_FORM_CONTROL_CLASS = [
  MIN_TOUCH_TARGET_CLASS,
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground outline-none transition",
  "focus:border-accent focus:ring-2 focus:ring-accent/25",
  "disabled:cursor-not-allowed disabled:opacity-60",
  FORM_CONTROL_FONT_CLASS,
].join(" ");

/** Filled primary action. */
export const PRIMARY_BUTTON_CLASS = [
  MIN_TOUCH_TARGET_CLASS,
  "inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors",
  "hover:bg-accent-hover",
  "disabled:cursor-not-allowed disabled:opacity-60",
  FOCUS_RING_CLASS,
].join(" ");

/** Outlined secondary action — OAuth providers, alternate flows. */
export const SECONDARY_BUTTON_CLASS = [
  MIN_TOUCH_TARGET_CLASS,
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors",
  "hover:bg-accent-muted",
  "disabled:cursor-not-allowed disabled:opacity-60",
  FOCUS_RING_CLASS,
].join(" ");

export const formControlClassName = (
  ...extra: Array<string | false | null | undefined>
) =>
  [FORM_CONTROL_BASE_CLASS, FORM_CONTROL_FONT_CLASS, ...extra]
    .filter(Boolean)
    .join(" ");

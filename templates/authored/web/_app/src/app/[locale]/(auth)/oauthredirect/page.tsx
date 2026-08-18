import { getTranslations } from "next-intl/server";

/**
 * Landing page for the Apple Sign In popup.
 *
 * Apple requires a registered `redirectURI` even in popup mode, where the popup
 * is closed by the SDK the moment it lands here and the token is delivered to
 * the opener. So this renders only for the instant before the window closes —
 * and as a readable fallback if a popup blocker forced a full redirect.
 *
 * It must stay in `PUBLIC_APP_PATHS`: the user has no session yet when Apple
 * sends them here.
 */
export default async function Page() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        aria-hidden
        className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <p className="text-sm text-foreground/70">{t("loading")}</p>
    </div>
  );
}

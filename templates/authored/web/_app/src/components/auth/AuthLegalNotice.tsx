import { useTranslations } from "next-intl";

/**
 * Placeholder legal line. Point these at your real Terms and Privacy pages
 * before launch — the App Store and Play Store both require reachable links.
 */
export function AuthLegalNotice() {
  const t = useTranslations("auth");

  return <p className="text-center text-xs text-muted">{t("legalNotice")}</p>;
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Placeholder landing page (feature 0001). Real marketing surfaces replace
 * this as features land.
 */
export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <h1 className="text-3xl font-semibold">{t("site_landing_title")}</h1>
      <ThemeToggle />
    </main>
  );
}

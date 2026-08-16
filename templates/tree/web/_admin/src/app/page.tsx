import { MdOutlineSpaceDashboard } from "react-icons/md";
import { t } from "@/lib/i18n/strings";

/**
 * Placeholder dashboard shell (feature 0001). Real admin surfaces replace
 * this as features land.
 */
export default function DashboardPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <MdOutlineSpaceDashboard size={40} aria-hidden />
      <h1 className="text-3xl font-semibold">{t("admin_dashboard_title")}</h1>
      <p className="text-muted">{t("admin_dashboard_placeholder")}</p>
    </main>
  );
}

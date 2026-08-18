import { PageHeader } from "@/components/layout/PageHeader";
import { SystemScreen } from "@/components/system/SystemScreen";
import { ts } from "@/lib/i18n/systemStrings";

/**
 * System overview. Sits inside the shell from `AppShell`, so it owns no page
 * chrome of its own.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={ts("system_title")}
        description={ts("system_description")}
      />
      <SystemScreen />
    </div>
  );
}

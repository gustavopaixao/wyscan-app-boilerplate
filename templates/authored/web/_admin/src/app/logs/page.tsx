import { PageHeader } from "@/components/layout/PageHeader";
import { LogsScreen } from "@/components/logs/LogsScreen";
import { tl } from "@/lib/i18n/logsStrings";

/**
 * Container logs. Sits inside the shell from `AppShell`, so it owns no page
 * chrome of its own.
 */
export default function LogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={tl("logs_title")}
        description={tl("logs_description")}
      />
      <LogsScreen />
    </div>
  );
}

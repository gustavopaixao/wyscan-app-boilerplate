import { PageHeader } from "@/components/layout/PageHeader";
import { UsersScreen } from "@/components/users/UsersScreen";
import { tu } from "@/lib/i18n/usersStrings";

/**
 * The user directory. Sits inside the shell from `AppShell`, so it owns no page
 * chrome of its own — no min-height, no centring.
 *
 * A server component wrapping one client screen: the header is static, and only
 * the table below it needs state.
 */
export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={tu("users_title")}
        description={tu("users_description")}
      />
      <UsersScreen />
    </div>
  );
}

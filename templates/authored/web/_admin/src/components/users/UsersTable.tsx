/**
 * The directory table.
 *
 * A real `<table>`, not a grid of divs: this is tabular data, and the semantics
 * are what let a screen reader announce "row 3, Role, Admin" instead of reading
 * five orphaned strings.
 *
 * Horizontal overflow is owned by the wrapper here rather than by the page, so
 * a narrow viewport scrolls the table and not the whole console.
 */
import { tu } from "@/lib/i18n/usersStrings";
import { type AdminUserSummary, formatJoined } from "@/lib/users/usersQuery";
import { RoleBadge, StatusBadge } from "./UserBadges";

const CELL = "px-4 py-3 text-sm";

type Props = {
  users: AdminUserSummary[];
  /** True while the first load is in flight; a page change keeps the old rows. */
  isLoading: boolean;
  /** Distinguishes "nothing here" from "nothing matches what you asked for". */
  isFiltered: boolean;
};

export function UsersTable({ users, isLoading, isFiltered }: Props) {
  if (isLoading) {
    return (
      <p className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        {tu("users_loading")}
      </p>
    );
  }

  if (users.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        {tu(isFiltered ? "users_empty_filtered" : "users_empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${CELL} font-semibold text-foreground`}>
              {tu("users_column_name")}
            </th>
            <th scope="col" className={`${CELL} font-semibold text-foreground`}>
              {tu("users_column_email")}
            </th>
            <th scope="col" className={`${CELL} font-semibold text-foreground`}>
              {tu("users_column_role")}
            </th>
            <th scope="col" className={`${CELL} font-semibold text-foreground`}>
              {tu("users_column_status")}
            </th>
            <th scope="col" className={`${CELL} font-semibold text-foreground`}>
              {tu("users_column_joined")}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-border last:border-b-0 hover:bg-accent-muted/50"
            >
              <td className={`${CELL} font-medium text-foreground`}>
                {user.displayName}
              </td>
              <td className={`${CELL} text-muted`}>{user.email}</td>
              <td className={CELL}>
                <RoleBadge role={user.role} />
              </td>
              <td className={CELL}>
                <StatusBadge status={user.status} />
              </td>
              <td className={`${CELL} whitespace-nowrap text-muted`}>
                {formatJoined(user.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

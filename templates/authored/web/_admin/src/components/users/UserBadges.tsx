/**
 * Role and status pills.
 *
 * Colour carries meaning here, so it is never the ONLY carrier — the label is
 * always spelled out next to it, which is what keeps the table readable to
 * anyone who cannot separate the two greens.
 */
import type { UserRole } from "@/lib/admin-access";
import { tu, type UsersStringKey } from "@/lib/i18n/usersStrings";
import type { UserStatus } from "@/lib/users/usersQuery";

const PILL =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

/** Admin is the only role worth making loud; the rest are informational. */
const ROLE_CLASS: Record<UserRole, string> = {
  user: "bg-accent-muted text-muted",
  moderator: "bg-accent-muted text-foreground",
  admin: "bg-accent text-on-accent",
};

const ROLE_LABEL: Record<UserRole, UsersStringKey> = {
  user: "users_role_user",
  moderator: "users_role_moderator",
  admin: "users_role_admin",
};

const STATUS_CLASS: Record<UserStatus, string> = {
  pending: "bg-accent-muted text-muted",
  active: "bg-success/15 text-success",
  blocked: "bg-danger/15 text-danger",
  deleted: "bg-accent-muted text-muted line-through",
};

const STATUS_LABEL: Record<UserStatus, UsersStringKey> = {
  pending: "users_status_pending",
  active: "users_status_active",
  blocked: "users_status_blocked",
  deleted: "users_status_deleted",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`${PILL} ${ROLE_CLASS[role] ?? ROLE_CLASS.user}`}>
      {tu(ROLE_LABEL[role] ?? "users_role_user")}
    </span>
  );
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`${PILL} ${STATUS_CLASS[status] ?? STATUS_CLASS.pending}`}>
      {tu(STATUS_LABEL[status] ?? "users_status_pending")}
    </span>
  );
}

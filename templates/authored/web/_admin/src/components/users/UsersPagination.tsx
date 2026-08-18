/**
 * Prev / position / Next.
 *
 * Deliberately not numbered pages: the count is unbounded, and a directory is
 * something you search rather than something you page through to item 400.
 */
import { tu } from "@/lib/i18n/usersStrings";

const BUTTON =
  "min-h-[44px] rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function UsersPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">{tu("users_total", { total })}</p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={BUTTON}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {tu("users_previous_page")}
        </button>

        {/* Polite: the position changes as a result of the click that moved focus. */}
        <p aria-live="polite" className="text-sm text-muted">
          {tu("users_page_status", { page, totalPages })}
        </p>

        <button
          type="button"
          className={BUTTON}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {tu("users_next_page")}
        </button>
      </div>
    </div>
  );
}

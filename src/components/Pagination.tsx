import type { Pagination as PaginationMeta } from "../api/adminApi";
import { buildWindow } from "./paginationWindow";

interface Props {
  pagination: PaginationMeta | null;
  page: number;
  onPageChange: (page: number) => void;
  /** Rows on the current page, for the "showing X–Y of Z" label. */
  rowCount?: number;
}

export default function Pagination({
  pagination,
  page,
  onPageChange,
  rowCount,
}: Props) {
  if (!pagination || pagination.pages <= 1) return null;

  const { pages, total, limit } = pagination;
  const pageNumbers = buildWindow(page, pages);

  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-info" aria-live="polite">
        Showing {first}–{rowCount !== undefined ? first + rowCount - 1 : last} of{" "}
        {total}
      </div>
      <div className="pagination-buttons">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          «
        </button>
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          Previous
        </button>

        {pageNumbers[0] > 1 && <span className="pagination-ellipsis">…</span>}

        {pageNumbers.map((p) => (
          <button
            key={p}
            className={`pagination-btn ${p === page ? "active" : ""}`}
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            // Screen readers announce the current page rather than relying on
            // the `active` class, which is purely visual.
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < pages && (
          <span className="pagination-ellipsis">…</span>
        )}

        <button
          className="pagination-btn"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
        </button>
        <button
          className="pagination-btn"
          disabled={page >= pages}
          onClick={() => onPageChange(pages)}
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </nav>
  );
}

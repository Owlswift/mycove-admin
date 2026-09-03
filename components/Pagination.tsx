interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Shown alongside the controls, e.g. "23 residents" — the count is
   * always of the *filtered* set, not the page slice, so it's on the
   * caller to compute it from the same array passed to usePaginatedList. */
  totalLabel?: string;
}

export default function Pagination({ page, totalPages, onPageChange, totalLabel }: Props) {
  if (totalPages <= 1 && !totalLabel) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-body">
      <p>{totalLabel}</p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-divider px-2.5 py-1 font-medium text-body hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="px-1">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-divider px-2.5 py-1 font-medium text-body hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

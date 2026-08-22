import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 10;

/**
 * Client-side pagination over an already-filtered array — every list
 * endpoint in this app returns its full estate-scoped result set in one
 * shot (no page/limit params), and at single-estate scale (dozens to low
 * hundreds of rows) slicing in the browser is simpler than adding
 * skip/take to every backend service for no real performance benefit.
 *
 * Pass the *filtered* array in (after search/status filters are applied)
 * — this only handles paging, not filtering, since what's filterable
 * differs per table. Resets to page 1 whenever the filtered array's
 * length changes, so a new search/filter never leaves you stranded on a
 * now-empty page.
 */
export function usePaginatedList<T>(items: T[], pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Belt-and-suspenders alongside the effect below: if a filter change
  // happens to keep `items.length` identical (so the effect doesn't fire)
  // but shrinks below the current page, this still clamps to a valid page
  // instead of rendering an empty slice.
  const clampedPage = Math.min(page, totalPages);

  // Resetting to page 1 whenever the filtered set's size changes (a new
  // search or filter) is intentional derived state, matching this
  // codebase's existing load-on-mount effect pattern elsewhere.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [items.length]);

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, clampedPage, pageSize]);

  return {
    page: clampedPage,
    setPage: (p: number) => setPage(Math.min(Math.max(1, p), totalPages)),
    totalPages,
    pageItems,
  };
}

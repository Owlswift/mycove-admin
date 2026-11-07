'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { AccessLogEntry } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type StatusFilter = 'ALL' | 'ON_SITE' | 'EXITED';

/** 'YYYY-MM-DD' in the browser's own timezone — what a date input gives/wants. */
function dateInputValue(d: Date): string {
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  return dateInputValue(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

/** Both bounds are inclusive whole days, compared in the browser's own timezone (matches what the date inputs show). */
function withinDateRange(iso: string, from: string, to: string): boolean {
  if (from && dateInputValue(new Date(iso)) < from) return false;
  if (to && dateInputValue(new Date(iso)) > to) return false;
  return true;
}

export default function AccessLogPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [entries, setEntries] = useState<AccessLogEntry[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'CHAIRMAN') return;
    apiFetch<AccessLogEntry[]>('/access-log')
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load access log.'));
  }, [user]);

  const onSiteCount = useMemo(() => (entries ?? []).filter((e) => !e.exitAt).length, [entries]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (status === 'ON_SITE' && e.exitAt) return false;
      if (status === 'EXITED' && !e.exitAt) return false;
      if (!withinDateRange(e.entryAt, dateFrom, dateTo)) return false;
      if (!q) return true;
      return e.visitor.toLowerCase().includes(q) || e.resident.fullName.toLowerCase().includes(q);
    });
  }, [entries, search, status, dateFrom, dateTo]);

  const filtersActive = status !== 'ALL' || dateFrom !== '' || dateTo !== '' || search.trim() !== '';
  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div>
            <h2 className="text-xl font-semibold text-title">Access Log</h2>
            <p className="mt-1 text-sm text-body">Visitor entries and exits recorded by security guards.</p>
          </div>

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}

          {entries && entries.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-divider bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-body">Currently on-site</p>
                <p className="mt-1 text-lg font-semibold text-green-800">{onSiteCount}</p>
              </div>
              <div className="rounded-lg border border-divider bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-body">Total entries recorded</p>
                <p className="mt-1 text-lg font-semibold text-title">{entries.length}</p>
              </div>
              <div className="rounded-lg border border-divider bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-body">Matching current filters</p>
                <p className="mt-1 text-lg font-semibold text-title">{filtered.length}</p>
              </div>
            </div>
          )}

          {entries === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}

          {entries && entries.length === 0 && (
            <p className="mt-6 rounded-lg border border-divider bg-surface px-4 py-6 text-center text-sm text-body">
              No visitor entries recorded yet.
            </p>
          )}

          {entries && entries.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-lg border border-divider bg-surface">
              <div className="flex flex-wrap items-center gap-3 border-b border-divider bg-background/40 px-4 py-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Search visitor or resident…" />
                <label className="flex items-center gap-1.5 text-xs font-medium text-body">
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                    className="rounded-md border border-divider bg-surface px-2 py-1 text-xs font-medium text-text focus:border-accent focus:outline-none"
                  >
                    <option value="ALL">All</option>
                    <option value="ON_SITE">Still on-site</option>
                    <option value="EXITED">Exited</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-body">
                  From
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-md border border-divider bg-surface px-2 py-1 text-xs font-medium text-text focus:border-accent focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-body">
                  To
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    max={dateInputValue(new Date())}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-md border border-divider bg-surface px-2 py-1 text-xs font-medium text-text focus:border-accent focus:outline-none"
                  />
                </label>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => {
                      const today = dateInputValue(new Date());
                      setDateFrom(today);
                      setDateTo(today);
                    }}
                    className="rounded-md border border-divider px-2 py-1 font-medium text-body hover:bg-accent-soft"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setDateFrom(daysAgo(7));
                      setDateTo(dateInputValue(new Date()));
                    }}
                    className="rounded-md border border-divider px-2 py-1 font-medium text-body hover:bg-accent-soft"
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => {
                      setDateFrom(daysAgo(30));
                      setDateTo(dateInputValue(new Date()));
                    }}
                    className="rounded-md border border-divider px-2 py-1 font-medium text-body hover:bg-accent-soft"
                  >
                    Last 30 days
                  </button>
                </div>
                {filtersActive && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatus('ALL');
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="text-xs font-medium text-accent hover:text-accent-hover"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-body">No entries match your search/filter.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-divider text-sm">
                      <thead>
                        <tr className="text-left text-body">
                          <th className="px-4 py-3 font-medium">Visitor</th>
                          <th className="px-4 py-3 font-medium">Visiting</th>
                          <th className="px-4 py-3 font-medium">Entered</th>
                          <th className="px-4 py-3 font-medium">Exited</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {pageItems.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-4 py-3 font-medium text-title">{entry.visitor}</td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/users/${entry.resident.id}`}
                                className="font-medium text-accent hover:text-accent-hover hover:underline"
                              >
                                {entry.resident.fullName}
                              </Link>
                              {entry.resident.house && (
                                <span className="ml-2 text-xs text-body">{entry.resident.house}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-body">{formatDateTime(entry.entryAt)}</td>
                            <td className="px-4 py-3 text-body">
                              {entry.exitAt ? (
                                formatDateTime(entry.exitAt)
                              ) : (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                  Still on-site
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-divider px-4 py-3">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      totalLabel={`${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

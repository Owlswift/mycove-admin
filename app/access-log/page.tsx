'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function AccessLogPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [entries, setEntries] = useState<AccessLogEntry[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'CHAIRMAN') return;
    apiFetch<AccessLogEntry[]>('/access-log')
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load access log.'));
  }, [user]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (status === 'ON_SITE' && e.exitAt) return false;
      if (status === 'EXITED' && !e.exitAt) return false;
      if (!q) return true;
      return e.visitor.toLowerCase().includes(q) || e.resident.fullName.toLowerCase().includes(q);
    });
  }, [entries, search, status]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-title">Access Log</h2>
              <p className="mt-1 text-sm text-body">Visitor entries and exits recorded by security guards.</p>
            </div>
            {entries && entries.length > 0 && (
              <div className="flex gap-2">
                <SearchInput value={search} onChange={setSearch} placeholder="Search visitor or resident…" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="ALL">All</option>
                  <option value="ON_SITE">Still on-site</option>
                  <option value="EXITED">Exited</option>
                </select>
              </div>
            )}
          </div>

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}

          {entries === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}

          {entries && entries.length === 0 && (
            <p className="mt-6 text-sm text-body">No visitor entries recorded yet.</p>
          )}

          {entries && entries.length > 0 && filtered.length === 0 && (
            <p className="mt-6 text-sm text-body">No entries match your search/filter.</p>
          )}

          {filtered.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-lg border border-divider bg-surface">
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
                        <a
                          href="/users"
                          className="font-medium text-accent hover:text-accent-hover hover:underline"
                        >
                          {entry.resident.fullName}
                        </a>
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
              <div className="border-t border-divider px-4 py-3">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalLabel={`${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

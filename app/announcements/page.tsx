'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { Announcement } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AnnouncementsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<Announcement[]>('/announcements');
      setAnnouncements(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load announcements.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN') void load();
  }, [user, load]);

  const categories = useMemo(
    () => Array.from(new Set((announcements ?? []).map((a) => a.category))).sort(),
    [announcements],
  );

  const filtered = useMemo(() => {
    if (!announcements) return [];
    const q = search.trim().toLowerCase();
    return announcements.filter((a) => {
      if (category !== 'ALL' && a.category !== category) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
    });
  }, [announcements, search, category]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Announcements</h2>
              <p className="mt-1 text-sm text-slate-500">Published history — every announcement is sent as a push notification too.</p>
            </div>
            <Link
              href="/announcements/new"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              + New announcement
            </Link>
          </div>

          {announcements && announcements.length > 0 && (
            <div className="mt-4 flex gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search title or body…" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="ALL">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
          {announcements === null && !error && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
          {announcements && announcements.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No announcements published yet.</p>
          )}
          {announcements && announcements.length > 0 && filtered.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No announcements match your search/filter.</p>
          )}
          {filtered.length > 0 && (
            <div className="mt-6 space-y-3">
              {pageItems.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-900">{a.title}</p>
                    <span className="shrink-0 rounded-full bg-accent2-soft px-2 py-0.5 text-xs font-medium text-accent2-hover">
                      {a.category}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{a.body}</p>
                  <p className="mt-3 text-xs text-slate-400">{formatDate(a.publishedAt)}</p>
                </div>
              ))}
            </div>
          )}
          {filtered.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalLabel={`${filtered.length} announcement${filtered.length === 1 ? '' : 's'}`}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

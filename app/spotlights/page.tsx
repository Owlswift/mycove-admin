'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { Spotlight } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

type CategoryFilter = 'ALL' | 'PERSON' | 'BUSINESS' | 'BIRTHDAY';
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function SpotlightsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [spotlights, setSpotlights] = useState<Spotlight[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<Spotlight[]>('/spotlights');
      setSpotlights(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load spotlights.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN' || user?.role === 'CHAIRMAN') void load();
  }, [user, load]);

  async function handleToggle(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/spotlights/${id}/toggle`, { method: 'POST' });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update spotlight.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/spotlights/${id}`, { method: 'DELETE' });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete spotlight.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!spotlights) return [];
    const q = search.trim().toLowerCase();
    return spotlights.filter((s) => {
      if (category !== 'ALL' && s.category !== category) return false;
      if (activeFilter === 'ACTIVE' && !s.active) return false;
      if (activeFilter === 'INACTIVE' && s.active) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q);
    });
  }, [spotlights, search, category, activeFilter]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-title">Spotlights</h2>
              <p className="mt-1 text-sm text-body">
                Celebrate residents or promote local businesses — the active one shows on the mobile home screen.
              </p>
            </div>
            <Link
              href="/spotlights/new"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              + New spotlight
            </Link>
          </div>

          {spotlights && spotlights.length > 0 && (
            <div className="mt-4 flex gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name…" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryFilter)}
                className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="ALL">All categories</option>
                <option value="PERSON">Person</option>
                <option value="BUSINESS">Business</option>
                <option value="BIRTHDAY">Birthday</option>
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
                className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="ALL">Active & inactive</option>
                <option value="ACTIVE">Active only</option>
                <option value="INACTIVE">Inactive only</option>
              </select>
            </div>
          )}

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}
          {spotlights === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}
          {spotlights && spotlights.length === 0 && (
            <p className="mt-6 text-sm text-body">No spotlights created yet.</p>
          )}
          {spotlights && spotlights.length > 0 && filtered.length === 0 && (
            <p className="mt-6 text-sm text-body">No spotlights match your search/filter.</p>
          )}
          {filtered.length > 0 && (
            <div className="mt-6 space-y-3">
              {pageItems.map((s) => (
                <div key={s.id} className="flex items-start gap-4 rounded-lg border border-divider bg-surface p-4">
                  {s.imageBase64 && (
                    <MediaPreview dataUrl={s.imageBase64} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-title">{s.name}</p>
                      <span className="rounded-full bg-accent2-soft px-2 py-0.5 text-xs font-medium text-accent2-hover">
                        {s.category === 'PERSON' ? 'Person' : s.category === 'BIRTHDAY' ? 'Birthday' : 'Business'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.active ? 'bg-green-100 text-green-800' : 'bg-divider text-body'
                        }`}
                      >
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-body">{s.description}</p>
                    {s.phone && <p className="mt-1 text-xs text-body/70">{s.phone}</p>}
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={() => handleToggle(s.id)}
                      disabled={busyId === s.id}
                      className="text-xs font-medium text-accent2 hover:text-accent2-hover disabled:opacity-50"
                    >
                      {s.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={busyId === s.id}
                      className="text-xs font-medium text-danger hover:text-danger disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {filtered.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalLabel={`${filtered.length} spotlight${filtered.length === 1 ? '' : 's'}`}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

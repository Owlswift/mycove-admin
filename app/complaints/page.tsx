'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Complaint, ComplaintStatus } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  SUBMITTED: 'bg-amber-100 text-amber-800',
  IN_REVIEW: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In Review',
  RESOLVED: 'Resolved',
};

export default function ComplaintsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | 'ALL'>('ALL');

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<Complaint[]>('/complaints/admin/all');
      setComplaints(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load complaints.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN') void load();
  }, [user, load]);

  async function handleStatusUpdate(id: string, status: ComplaintStatus) {
    setBusyId(id);
    try {
      await apiFetch(`/complaints/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update complaint status.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!complaints) return [];
    const q = search.trim().toLowerCase();
    return complaints.filter((c) => {
      if (status !== 'ALL' && c.status !== status) return false;
      if (!q) return true;
      return (
        c.category.toLowerCase().includes(q) ||
        c.ref.toLowerCase().includes(q) ||
        c.user.fullName.toLowerCase().includes(q)
      );
    });
  }, [complaints, search, status]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-title">Complaints</h2>
              <p className="mt-1 text-sm text-body">
                Resident complaints — update the status as they're addressed.
              </p>
            </div>
            {complaints && complaints.length > 0 && (
              <div className="flex gap-2">
                <SearchInput value={search} onChange={setSearch} placeholder="Search category, ref, resident…" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ComplaintStatus | 'ALL')}
                  className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="ALL">All statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            )}
          </div>

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}
          {complaints === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}
          {complaints && complaints.length === 0 && (
            <p className="mt-6 text-sm text-body">No complaints submitted yet.</p>
          )}
          {complaints && complaints.length > 0 && filtered.length === 0 && (
            <p className="mt-6 text-sm text-body">No complaints match your search/filter.</p>
          )}
          {filtered.length > 0 && (
            <div className="mt-6 space-y-3">
              {pageItems.map((c) => (
                <div key={c.id} className="rounded-lg border border-divider bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-title">{c.category}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}
                        >
                          {STATUS_LABELS[c.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-body">{c.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-body/70">
                        <span>Ref: {c.ref}</span>
                        <span>By: {c.user.fullName}</span>
                        <span>Phone: {c.user.phone}</span>
                        {c.user.house && <span>House: {c.user.house}</span>}
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {c.status !== 'IN_REVIEW' && (
                      <button
                        onClick={() => handleStatusUpdate(c.id, 'IN_REVIEW')}
                        disabled={busyId === c.id}
                        className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        Mark In Review
                      </button>
                    )}
                    {c.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleStatusUpdate(c.id, 'RESOLVED')}
                        disabled={busyId === c.id}
                        className="rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {c.status !== 'SUBMITTED' && (
                      <button
                        onClick={() => handleStatusUpdate(c.id, 'SUBMITTED')}
                        disabled={busyId === c.id}
                        className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
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
              totalLabel={`${filtered.length} complaint${filtered.length === 1 ? '' : 's'}`}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
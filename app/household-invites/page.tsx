'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { HouseholdInvite, HouseholdMember } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function HouseholdInvitesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [invites, setInvites] = useState<HouseholdInvite[] | null>(null);
  const [members, setMembers] = useState<HouseholdMember[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [invitesResult, membersResult] = await Promise.all([
        apiFetch<HouseholdInvite[]>('/admin/household-invites'),
        apiFetch<HouseholdMember[]>('/admin/household-invites/members'),
      ]);
      setInvites(invitesResult);
      setMembers(membersResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load household invitations.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN') void load();
  }, [user, load]);

  async function handleReview(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    try {
      await apiFetch(`/admin/household-invites/${id}/${action}`, { method: 'POST' });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${action} invitation.`);
    } finally {
      setBusyId(null);
    }
  }

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.invitedBy.fullName.toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filteredMembers);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Household Invitations</h2>
            <p className="mt-1 text-sm text-slate-500">
              A resident invited someone to get their own account under their household — no separate dues
              or levies for the invitee once approved. Review before it goes live.
            </p>
          </div>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pending Approval
          </h3>
          {invites === null && !error && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
          {invites && invites.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No pending household invitations.</p>
          )}
          {invites && invites.length > 0 && (
            <div className="mt-3 space-y-3">
              {invites.map((inv) => (
                <div key={inv.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{inv.invitedFullName}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{inv.invitedPhone}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                          Invited by: {inv.invitedBy.fullName}
                          {inv.invitedBy.house ? ` (${inv.invitedBy.house})` : ''}
                        </span>
                        <span>{formatDate(inv.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleReview(inv.id, 'approve')}
                      disabled={busyId === inv.id}
                      className="rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(inv.id, 'reject')}
                      disabled={busyId === inv.id}
                      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Household Members
            </h3>
            {members && members.length > 0 && (
              <SearchInput value={memberSearch} onChange={setMemberSearch} placeholder="Search name…" />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Every account created by accepting a household invitation, and who invited them.
          </p>
          {members === null && !error && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
          {members && members.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No household members yet.</p>
          )}
          {members && members.length > 0 && filteredMembers.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No members match your search.</p>
          )}
          {filteredMembers.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Invited by</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{m.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{m.phone}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.invitedBy.fullName}
                        {m.invitedBy.house ? ` (${m.invitedBy.house})` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(m.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-200 px-4 py-3">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalLabel={`${filteredMembers.length} member${filteredMembers.length === 1 ? '' : 's'}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

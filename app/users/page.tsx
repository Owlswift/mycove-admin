'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import {
  AdminUser,
  OccupancyType,
  OCCUPANCY_TYPE_LABELS,
  ResidentType,
  RESIDENT_TYPE_LABELS,
  Role,
} from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import CreateUserModal from '@/components/CreateUserModal';
import AppShell, { ROLE_LABELS } from '@/components/AppShell';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

type UsersTab = 'residents' | 'guards' | 'staff';

export default function UsersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<UsersTab>('residents');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ name: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resettingGuardUser, setResettingGuardUser] = useState<AdminUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingOccupancyId, setSavingOccupancyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState<'' | OccupancyType | 'UNSET'>('');
  const [residentTypeFilter, setResidentTypeFilter] = useState<'' | ResidentType>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'AWAITING' | 'REVOKED'>('');

  const loadUsers = useCallback(async () => {
    try {
      const result = await apiFetch<AdminUser[]>('/admin/users');
      setUsers(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN' || user?.role === 'CHAIRMAN') void loadUsers();
  }, [user, loadUsers]);

  function handleCreated(defaultPassword: string | null, fullName: string) {
    setShowCreateModal(false);
    if (defaultPassword) setRevealedPassword({ name: fullName, password: defaultPassword });
    void loadUsers();
  }

  async function handleResetPassword(target: AdminUser) {
    if (target.role === 'GUARD') {
      setResettingGuardUser(target);
      return;
    }
    if (!confirm(`Reset ${target.fullName}'s password back to their default (surname in caps)?`)) return;
    setResettingId(target.id);
    try {
      const result = await apiFetch<{ defaultPassword: string | null }>(`/admin/users/${target.id}/reset-password`, {
        method: 'POST',
      });
      if (result.defaultPassword) setRevealedPassword({ name: target.fullName, password: result.defaultPassword });
      void loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password.');
    } finally {
      setResettingId(null);
    }
  }

  async function handleToggleActive(target: AdminUser) {
    const revoking = target.active;
    const verb = revoking ? 'revoke' : 'restore';
    if (!confirm(`${revoking ? 'Revoke' : 'Restore'} ${target.fullName}'s access to the app?`)) return;
    setTogglingId(target.id);
    try {
      await apiFetch(`/admin/users/${target.id}/${revoking ? 'revoke' : 'restore'}`, { method: 'POST' });
      void loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${verb} access.`);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSetOccupancyType(target: AdminUser, occupancyType: OccupancyType) {
    setSavingOccupancyId(target.id);
    try {
      await apiFetch(`/admin/users/${target.id}/occupancy-type`, {
        method: 'PATCH',
        body: JSON.stringify({ occupancyType }),
      });
      void loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save the tenant/landlord type.');
    } finally {
      setSavingOccupancyId(null);
    }
  }

  async function handleSetGuardPassword(newPassword: string) {
    if (!resettingGuardUser) return;
    setResettingId(resettingGuardUser.id);
    try {
      await apiFetch(`/admin/users/${resettingGuardUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });
      setResettingGuardUser(null);
      void loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password.');
    } finally {
      setResettingId(null);
    }
  }

  if (userLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center text-body">
        Loading…
      </main>
    );
  }

  if (users === null && !error) {
    return (
      <AppShell user={user} allow={['ADMIN', 'CHAIRMAN']}>
        <div className="flex flex-1 items-center justify-center px-6 py-8 text-body">Loading…</div>
      </AppShell>
    );
  }

  const q = search.trim().toLowerCase();
  const searched =
    users?.filter(
      (u) =>
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.house?.toLowerCase().includes(q) ?? false),
    ) ?? [];
  function matchesStatus(u: AdminUser, filter: '' | 'ACTIVE' | 'AWAITING' | 'REVOKED'): boolean {
    if (!filter) return true;
    if (filter === 'REVOKED') return !u.active;
    if (filter === 'AWAITING') return u.active && u.mustResetPassword;
    return u.active && !u.mustResetPassword;
  }

  const residents = searched
    .filter((u) => u.role === 'RESIDENT')
    .filter((u) => !occupancyFilter || (occupancyFilter === 'UNSET' ? !u.occupancyType : u.occupancyType === occupancyFilter))
    .filter((u) => !residentTypeFilter || u.residentType === residentTypeFilter)
    .filter((u) => matchesStatus(u, statusFilter));
  const filtersActive = occupancyFilter !== '' || residentTypeFilter !== '' || statusFilter !== '';
  // Dues are billed from the move-in month the admin records, so any resident
  // who pays dues without one needs it filling in.
  const missingMoveIn = (users ?? []).filter(
    (u) => u.role === 'RESIDENT' && u.active && u.duesLiable !== false && !u.moveInMonth,
  );
  const missingOccupancy = (users ?? []).filter((u) => u.role === 'RESIDENT' && u.active && !u.occupancyType);
  const guards = searched.filter((u) => u.role === 'GUARD');
  // A resident who also holds a staff role (e.g. the chairman) appears here as
  // well as under Residents — same account, two hats.
  const admins = searched.filter((u) => staffRolesOf(u).length > 0);

  const TABS: { id: UsersTab; label: string; count: number }[] = [
    { id: 'residents', label: 'Residents', count: residents.length },
    { id: 'guards', label: 'Security Guards', count: guards.length },
    { id: 'staff', label: 'Staff / Executives', count: admins.length },
  ];

  return (
    <AppShell user={user} allow={['ADMIN', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-title">Residents</h2>
              <p className="mt-1 text-sm text-body">Manage resident, guard, and staff accounts.</p>
            </div>
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, house…" />
              {(user.role === 'ADMIN' || user.role === 'CHAIRMAN') && (
                <>
                  <Link
                    href="/users/import"
                    className="rounded-md border border-divider px-4 py-2 text-sm font-semibold text-text hover:bg-accent-soft"
                  >
                    Bulk import
                  </Link>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                  >
                    + New account
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6" role="tablist" aria-label="Account sections">
            <div className="inline-flex items-center gap-1 rounded-lg bg-accent-soft p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  id={`users-tab-${t.id}`}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.id}
                  aria-controls={`users-panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-surface text-title shadow-sm'
                      : 'text-body hover:text-title'
                  }`}
                >
                  {t.label} <span className={tab === t.id ? 'text-body' : 'text-body/70'}>({t.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {revealedPassword && (
              <div className="flex items-start justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-900">
                  Default password for <span className="font-semibold">{revealedPassword.name}</span>:{' '}
                  <span className="font-mono font-semibold">{revealedPassword.password}</span>{' '}
                  — share this with them now, it won&apos;t be shown again.
                </p>
                <button
                  onClick={() => setRevealedPassword(null)}
                  className="ml-4 shrink-0 text-sm text-amber-700 hover:text-amber-900"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            {tab === 'residents' && (user.role === 'ADMIN' || user.role === 'CHAIRMAN') && missingMoveIn.length > 0 && (
              <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">
                  {missingMoveIn.length} resident{missingMoveIn.length === 1 ? ' has' : 's have'} no move-in month
                  recorded.
                </p>
                <p className="mt-1">
                  Dues are billed from the month and year a resident moved in or began operating, and only you can set
                  it. Open each resident marked &quot;Move-in not set&quot; below and enter it, so their balance is
                  worked out correctly.{' '}
                  <Link href={`/users/${missingMoveIn[0]!.id}`} className="font-medium underline">
                    Start with {missingMoveIn[0]!.fullName}
                  </Link>
                </p>
              </div>
            )}

            {tab === 'residents' && (user.role === 'ADMIN' || user.role === 'CHAIRMAN') && missingOccupancy.length > 0 && (
              <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">
                  {missingOccupancy.length} resident{missingOccupancy.length === 1 ? ' has' : 's have'} no
                  tenant/landlord recorded.
                </p>
                <p className="mt-1">
                  Open each resident marked &quot;Tenant/landlord not set&quot; below and record it.{' '}
                  <Link href={`/users/${missingOccupancy[0]!.id}`} className="font-medium underline">
                    Start with {missingOccupancy[0]!.fullName}
                  </Link>
                </p>
              </div>
            )}
          </div>

          <div className="mt-4">
            {tab === 'residents' && (
              <div id="users-panel-residents" role="tabpanel" aria-labelledby="users-tab-residents">
                {residents.length === 0 ? (
                  <p className="rounded-lg border border-divider bg-surface px-4 py-6 text-center text-sm text-body">
                    {q
                      ? `No residents match "${search}".`
                      : filtersActive
                        ? 'No residents match these filters.'
                        : 'No residents yet.'}
                  </p>
                ) : (
                  <UserSection
                    showOccupancy
                    users={residents}
                    onReset={handleResetPassword}
                    resettingId={resettingId}
                    onToggleActive={handleToggleActive}
                    togglingId={togglingId}
                    onSetOccupancyType={handleSetOccupancyType}
                    savingOccupancyId={savingOccupancyId}
                    currentUserId={user.id}
                    viewerRole={user.role}
                    toolbar={
                      <>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-body">
                          Tenant/Landlord
                          <select
                            value={occupancyFilter}
                            onChange={(e) => setOccupancyFilter(e.target.value as '' | OccupancyType | 'UNSET')}
                            className="rounded-md border border-divider bg-surface px-2 py-1 text-xs font-medium text-text focus:border-accent focus:outline-none"
                          >
                            <option value="">All</option>
                            <option value="TENANT">Tenant</option>
                            <option value="LANDLORD">Landlord</option>
                            <option value="UNSET">Not set</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-body">
                          Resident type
                          <select
                            value={residentTypeFilter}
                            onChange={(e) => setResidentTypeFilter(e.target.value as '' | ResidentType)}
                            className="rounded-md border border-divider bg-surface px-2 py-1 text-xs font-medium text-text focus:border-accent focus:outline-none"
                          >
                            <option value="">All</option>
                            <option value="REGULAR">{RESIDENT_TYPE_LABELS.REGULAR}</option>
                            <option value="COMMERCIAL">{RESIDENT_TYPE_LABELS.COMMERCIAL}</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-body">
                          Status
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as '' | 'ACTIVE' | 'AWAITING' | 'REVOKED')}
                            className="rounded-md border border-divider bg-surface px-2 py-1 text-xs font-medium text-text focus:border-accent focus:outline-none"
                          >
                            <option value="">All</option>
                            <option value="ACTIVE">Active</option>
                            <option value="AWAITING">Awaiting first login</option>
                            <option value="REVOKED">Revoked</option>
                          </select>
                        </label>
                        {filtersActive && (
                          <button
                            onClick={() => {
                              setOccupancyFilter('');
                              setResidentTypeFilter('');
                              setStatusFilter('');
                            }}
                            className="text-xs font-medium text-accent hover:text-accent-hover"
                          >
                            Clear filters
                          </button>
                        )}
                      </>
                    }
                  />
                )}
              </div>
            )}

            {tab === 'guards' && (
              <div id="users-panel-guards" role="tabpanel" aria-labelledby="users-tab-guards">
                {guards.length === 0 ? (
                  <p className="rounded-lg border border-divider bg-surface px-4 py-6 text-center text-sm text-body">
                    {q ? `No security guards match "${search}".` : 'No security guards yet.'}
                  </p>
                ) : (
                  <UserSection
                    users={guards}
                    onReset={handleResetPassword}
                    resettingId={resettingId}
                    onToggleActive={handleToggleActive}
                    togglingId={togglingId}
                    currentUserId={user.id}
                    viewerRole={user.role}
                  />
                )}
              </div>
            )}

            {tab === 'staff' && (
              <div id="users-panel-staff" role="tabpanel" aria-labelledby="users-tab-staff">
                {admins.length === 0 ? (
                  <p className="rounded-lg border border-divider bg-surface px-4 py-6 text-center text-sm text-body">
                    {q ? `No staff/executive accounts match "${search}".` : 'No staff/executive accounts yet.'}
                  </p>
                ) : (
                  <UserSection
                    showRole
                    users={admins}
                    onReset={handleResetPassword}
                    resettingId={resettingId}
                    onToggleActive={handleToggleActive}
                    togglingId={togglingId}
                    currentUserId={user.id}
                    viewerRole={user.role}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
        )}
        {resettingGuardUser && (
          <SetGuardPasswordModal
            user={resettingGuardUser}
            onClose={() => setResettingGuardUser(null)}
            onSubmit={handleSetGuardPassword}
            submitting={resettingId === resettingGuardUser.id}
          />
        )}
      </div>
    </AppShell>
  );
}

function SetGuardPasswordModal({
  user,
  onClose,
  onSubmit,
  submitting,
}: {
  user: AdminUser;
  onClose: () => void;
  onSubmit: (password: string) => void;
  submitting: boolean;
}) {
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(password);
        }}
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-title">New password for {user.fullName}</h2>
        <p className="mt-1 text-sm text-body">
          Security guard passwords are set directly by an admin — share the new password with them out-of-band.
        </p>
        <div className="mt-5">
          <label className="block text-sm font-medium text-text">Password</label>
          <input
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-body hover:bg-accent-soft"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Set password'}
          </button>
        </div>
      </form>
    </div>
  );
}

const STAFF_ROLES: Role[] = ['ADMIN', 'FINANCE_SECRETARY', 'PROJECT_ADMIN', 'CHAIRMAN'];

/** Every staff role this person holds — their primary role (if it's a staff one) plus any extra ones a resident has been given. */
function staffRolesOf(u: AdminUser): Role[] {
  return [...(STAFF_ROLES.includes(u.role) ? [u.role] : []), ...(u.staffRoles ?? [])];
}

/**
 * The admin manages residents and guards; staff accounts are the
 * chairman's own. The chairman has every permission the admin has on top
 * of that, so they can manage everyone. Nobody manages their own here —
 * password changes go through "Change password".
 */
function canManage(viewer: Role, target: AdminUser, viewerId: string): boolean {
  if (target.id === viewerId) return false;
  if (viewer === 'CHAIRMAN') return true;
  const targetIsStaff = staffRolesOf(target).length > 0;
  return viewer === 'ADMIN' && !targetIsStaff;
}

function UserSection({
  users,
  onReset,
  resettingId,
  onToggleActive,
  togglingId,
  onSetOccupancyType,
  savingOccupancyId,
  currentUserId,
  viewerRole,
  showRole = false,
  showOccupancy = false,
  toolbar,
}: {
  showRole?: boolean;
  showOccupancy?: boolean;
  users: AdminUser[];
  onReset: (user: AdminUser) => void;
  resettingId: string | null;
  onToggleActive: (user: AdminUser) => void;
  togglingId: string | null;
  onSetOccupancyType?: (user: AdminUser, occupancyType: OccupancyType) => void;
  savingOccupancyId?: string | null;
  currentUserId: string;
  viewerRole: Role;
  toolbar?: React.ReactNode;
}) {
  const { page, setPage, totalPages, pageItems } = usePaginatedList(users);

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-divider bg-surface">
        {toolbar && (
          <div className="flex flex-wrap items-center gap-4 border-b border-divider bg-background/40 px-4 py-2.5">
            {toolbar}
          </div>
        )}
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-divider text-sm">
          <thead>
            <tr className="text-left text-body">
              <th className="px-4 py-3 font-medium">Name</th>
              {showRole && <th className="px-4 py-3 font-medium">Role</th>}
              {showOccupancy && <th className="px-4 py-3 font-medium">Tenant/Landlord</th>}
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">House</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {pageItems.map((user) => (
              <tr key={user.id} className={user.active ? undefined : 'bg-red-50/40'}>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/users/${user.id}`} className="text-title hover:text-accent hover:underline">
                    {user.fullName}
                  </Link>
                  {user.role === 'RESIDENT' && user.active && user.duesLiable !== false && !user.moveInMonth && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Move-in not set
                    </span>
                  )}
                  {user.residentType === 'COMMERCIAL' && (
                    <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-title">
                      Commercial
                    </span>
                  )}
                </td>
                {showOccupancy && (
                  <td className="px-4 py-3">
                    {user.occupancyType ? (
                      <span className="text-body">{OCCUPANCY_TYPE_LABELS[user.occupancyType]}</span>
                    ) : viewerRole === 'ADMIN' || viewerRole === 'CHAIRMAN' ? (
                      <select
                        value=""
                        onChange={(e) => onSetOccupancyType?.(user, e.target.value as OccupancyType)}
                        disabled={savingOccupancyId === user.id}
                        aria-label={`Tenant or landlord for ${user.fullName}`}
                        className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 focus:border-accent focus:outline-none disabled:opacity-50"
                      >
                        <option value="" disabled>
                          Not set
                        </option>
                        <option value="TENANT">Tenant</option>
                        <option value="LANDLORD">Landlord</option>
                      </select>
                    ) : (
                      <span className="text-body">—</span>
                    )}
                  </td>
                )}
                {showRole && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {staffRolesOf(user).map((r) => (
                        <span key={r} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-title">
                          {ROLE_LABELS[r]}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-body">{user.phone}</td>
                <td className="px-4 py-3 text-body">{user.house ?? '—'}</td>
                <td className="px-4 py-3">
                  {!user.active ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      Revoked
                    </span>
                  ) : user.mustResetPassword ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Awaiting first login
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.active && canManage(viewerRole, user, currentUserId) && (
                    <button
                      onClick={() => onReset(user)}
                      disabled={resettingId === user.id}
                      className="text-xs font-medium text-body hover:text-title disabled:opacity-50"
                    >
                      {resettingId === user.id
                        ? 'Saving…'
                        : user.role === 'GUARD'
                          ? 'Set password'
                          : 'Reset password'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {canManage(viewerRole, user, currentUserId) && (
                    <button
                      onClick={() => onToggleActive(user)}
                      disabled={togglingId === user.id}
                      className={`text-xs font-medium disabled:opacity-50 ${
                        user.active ? 'text-danger hover:text-danger' : 'text-green-700 hover:text-green-900'
                      }`}
                    >
                      {togglingId === user.id ? 'Saving…' : user.active ? 'Revoke access' : 'Restore access'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {totalPages > 1 && (
          <div className="border-t border-divider px-4 py-3">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

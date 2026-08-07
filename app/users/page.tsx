'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { AdminUser } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import CreateUserModal from '@/components/CreateUserModal';
import AppShell from '@/components/AppShell';

export default function UsersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ name: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resettingGuardUser, setResettingGuardUser] = useState<AdminUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
    if (user?.role === 'ADMIN') void loadUsers();
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
      <main className="flex flex-1 items-center justify-center text-slate-500">
        Loading…
      </main>
    );
  }

  if (users === null && !error) {
    return (
      <AppShell user={user} allow={['ADMIN']}>
        <div className="flex flex-1 items-center justify-center px-6 py-8 text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  const residents = users?.filter((u) => u.role === 'RESIDENT') ?? [];
  const guards = users?.filter((u) => u.role === 'GUARD') ?? [];
  const admins = users?.filter((u) => u.role === 'ADMIN' || u.role === 'FINANCE_SECRETARY' || u.role === 'PROJECT_ADMIN') ?? [];

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Users</h2>
              <p className="mt-1 text-sm text-slate-500">Manage resident, guard, and staff accounts.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              + New account
            </button>
          </div>

          {revealedPassword && (
            <div className="mt-6 flex items-start justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
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

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

          <UserSection
            title="Residents"
            users={residents}
            onReset={handleResetPassword}
            resettingId={resettingId}
            onToggleActive={handleToggleActive}
            togglingId={togglingId}
            currentUserId={user.id}
          />
          <UserSection
            title="Security Guards"
            users={guards}
            onReset={handleResetPassword}
            resettingId={resettingId}
            onToggleActive={handleToggleActive}
            togglingId={togglingId}
            currentUserId={user.id}
          />
          <UserSection
            title="Staff"
            users={admins}
            onReset={handleResetPassword}
            resettingId={resettingId}
            onToggleActive={handleToggleActive}
            togglingId={togglingId}
            currentUserId={user.id}
          />
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
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-slate-900">New password for {user.fullName}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Security guard passwords are set directly by an admin — share the new password with them out-of-band.
        </p>
        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
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

function UserSection({
  title,
  users,
  onReset,
  resettingId,
  onToggleActive,
  togglingId,
  currentUserId,
}: {
  title: string;
  users: AdminUser[];
  onReset: (user: AdminUser) => void;
  resettingId: string | null;
  onToggleActive: (user: AdminUser) => void;
  togglingId: string | null;
  currentUserId: string;
}) {
  if (users.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">House</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className={user.active ? undefined : 'bg-red-50/40'}>
                <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                <td className="px-4 py-3 text-slate-600">{user.house ?? '—'}</td>
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
                  {user.role !== 'ADMIN' && user.active && (
                    <button
                      onClick={() => onReset(user)}
                      disabled={resettingId === user.id}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
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
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => onToggleActive(user)}
                      disabled={togglingId === user.id}
                      className={`text-xs font-medium disabled:opacity-50 ${
                        user.active ? 'text-red-600 hover:text-red-800' : 'text-green-700 hover:text-green-900'
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
    </div>
  );
}

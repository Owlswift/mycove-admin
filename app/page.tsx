'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { clearTokens, getAccessToken } from '@/lib/auth';
import { AdminUser } from '@/lib/types';
import CreateUserModal from '@/components/CreateUserModal';

export default function DashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ name: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const result = await apiFetch<AdminUser[]>('/admin/users');
      setUsers(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users.');
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    // Standard fetch-on-mount — a data-fetching library would be
    // disproportionate complexity for this small internal tool.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers();
  }, [router, loadUsers]);

  function handleLogout() {
    clearTokens();
    router.push('/login');
  }

  function handleCreated(defaultPassword: string, fullName: string) {
    setShowCreateModal(false);
    setRevealedPassword({ name: fullName, password: defaultPassword });
    void loadUsers();
  }

  async function handleResetPassword(user: AdminUser) {
    if (!confirm(`Reset ${user.fullName}'s password back to their default (surname in caps)?`)) return;
    setResettingId(user.id);
    try {
      const result = await apiFetch<{ defaultPassword: string }>(`/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      setRevealedPassword({ name: user.fullName, password: result.defaultPassword });
      void loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password.');
    } finally {
      setResettingId(null);
    }
  }

  if (users === null && !error) {
    return (
      <main className="flex flex-1 items-center justify-center text-slate-500">
        Loading…
      </main>
    );
  }

  const residents = users?.filter((u) => u.role === 'RESIDENT') ?? [];
  const guards = users?.filter((u) => u.role === 'GUARD') ?? [];
  const admins = users?.filter((u) => u.role === 'ADMIN') ?? [];

  return (
    <main className="flex-1 bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">CommunityHub Admin</h1>
            <p className="mt-1 text-sm text-slate-500">Manage resident and guard accounts.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + New Resident / Guard
            </button>
            <button
              onClick={handleLogout}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
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

        <UserSection title="Residents" users={residents} onReset={handleResetPassword} resettingId={resettingId} />
        <UserSection title="Security Guards" users={guards} onReset={handleResetPassword} resettingId={resettingId} />
        <UserSection title="Admins" users={admins} onReset={handleResetPassword} resettingId={resettingId} />
      </div>

      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
      )}
    </main>
  );
}

function UserSection({
  title,
  users,
  onReset,
  resettingId,
}: {
  title: string;
  users: AdminUser[];
  onReset: (user: AdminUser) => void;
  resettingId: string | null;
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                <td className="px-4 py-3 text-slate-600">{user.house ?? '—'}</td>
                <td className="px-4 py-3">
                  {user.mustResetPassword ? (
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
                  {user.role !== 'ADMIN' && (
                    <button
                      onClick={() => onReset(user)}
                      disabled={resettingId === user.id}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
                    >
                      {resettingId === user.id ? 'Resetting…' : 'Reset password'}
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

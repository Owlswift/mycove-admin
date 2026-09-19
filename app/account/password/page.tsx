'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

/** Any signed-in staff member can choose a new password here, given their current one. */
export default function ChangePasswordPage() {
  const { user, loading } = useCurrentUser();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'A number', met: /[0-9]/.test(password) },
    { label: 'An uppercase letter', met: /[A-Z]/.test(password) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (rules.some((r) => !r.met)) {
      setError('Your new password does not meet all the requirements yet.');
      return;
    }
    if (password !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: password }),
      });
      setCurrent('');
      setPassword('');
      setConfirm('');
      setMessage('Password changed. Use it the next time you sign in.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none';

  return (
    <AppShell user={user} allow={['ADMIN', 'FINANCE_SECRETARY', 'PROJECT_ADMIN', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-md">
          <h2 className="text-xl font-semibold text-title">Change password</h2>
          <p className="mt-1 text-sm text-body">Choose a new password for {user.fullName}.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-divider bg-surface p-5">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-text">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-text">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <ul className="mt-2 space-y-0.5 text-xs">
                {rules.map((r) => (
                  <li key={r.label} className={r.met ? 'text-green-700' : 'text-body'}>
                    {r.met ? '✓' : '•'} {r.label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-text">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

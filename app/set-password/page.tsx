'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { clearTokens } from '@/lib/auth';
import { useCurrentUser } from '@/lib/use-current-user';

/**
 * First sign-in for an account an admin created: the password they were
 * handed is only a starting point, so nothing else in the dashboard opens
 * until they choose their own. Anyone who has already done this is sent
 * straight on to their dashboard.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && !user.mustResetPassword) router.replace('/');
  }, [user, router]);

  if (loading || !user || !user.mustResetPassword) {
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
    if (rules.some((r) => !r.met)) {
      setError('Your new password does not meet all the requirements yet.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/complete-force-reset', {
        method: 'POST',
        body: JSON.stringify({ newPassword: password }),
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  function handleSignOut() {
    clearTokens();
    router.replace('/login');
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-warm-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-divider bg-surface p-8 shadow-sm"
      >
        <Image src="/mycove-logo.png" alt="" width={36} height={36} />
        <h1 className="mt-4 text-xl font-semibold text-title">Choose your own password</h1>
        <p className="mt-1 text-sm text-body">
          Welcome, {user.fullName.split(' ')[0]}. The password you signed in with was a temporary one — set your own
          to continue.
        </p>

        <div className="mt-6 space-y-4">
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
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
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
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <ul className="space-y-1 text-xs">
            {rules.map((r) => (
              <li key={r.label} className={r.met ? 'text-green-700' : 'text-body'}>
                {r.met ? '✓' : '○'} {r.label}
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
        <button type="button" onClick={handleSignOut} className="mt-3 w-full text-center text-xs text-body hover:text-title">
          Sign out
        </button>
      </form>
    </main>
  );
}

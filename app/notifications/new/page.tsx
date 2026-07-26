'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

type Target = 'RESIDENTS' | 'GUARDS' | 'ALL';

export default function NewNotificationPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<Target>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await apiFetch<{ message: string }>('/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message, target }),
      });
      setMessage('');
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send notification.');
    } finally {
      setLoading(false);
    }
  }

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-900">Push Notification</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sends an in-app notification and a push alert immediately.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Message</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Gate 2 will be closed for repairs from 2pm today."
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Send to</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as Target)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="ALL">Everyone (residents + guards)</option>
                <option value="RESIDENTS">Residents only</option>
                <option value="GUARDS">Guards only</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

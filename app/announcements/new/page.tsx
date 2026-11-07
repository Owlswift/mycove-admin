'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

export default function NewAnnouncementPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, category, body }),
      });
      router.push('/announcements');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to publish announcement.');
    } finally {
      setLoading(false);
    }
  }

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/announcements" className="text-sm font-medium text-accent hover:text-accent-hover">
            ← Back to announcements
          </Link>
          <h2 className="mt-2 text-xl font-semibold text-title">New Announcement</h2>
          <p className="mt-1 text-sm text-body">
            Published immediately to every resident and sent as a push notification.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-divider bg-surface p-6">
            <div>
              <label className="block text-sm font-medium text-text">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Water Tank Cleaning This Saturday"
                className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Category</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Maintenance"
                className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Body</label>
              <textarea
                required
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Full announcement text…"
                className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Publishing…' : 'Publish'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

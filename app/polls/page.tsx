'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { Poll } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

export default function PollsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [error, setError] = useState('');

  const loadPolls = useCallback(async () => {
    try {
      const result = await apiFetch<Poll[]>('/polls');
      setPolls(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load polls.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN') void loadPolls();
  }, [user, loadPolls]);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Polls</h2>
              <p className="mt-1 text-sm text-slate-500">Resident polls and live vote results.</p>
            </div>
            <Link
              href="/polls/new"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              + New poll
            </Link>
          </div>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
          {polls === null && !error && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
          {polls && polls.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No polls created yet.</p>
          )}
          {polls && polls.length > 0 && (
            <div className="mt-6 space-y-3">
              {polls.map((poll) => (
                <div key={poll.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{poll.question}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        poll.closesIn === 'Closed'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-accent2-soft text-accent2-hover'
                      }`}
                    >
                      {poll.closesIn}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {poll.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-3">
                        <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${option.pct}%` }} />
                        </div>
                        <span className="w-40 shrink-0 truncate text-sm text-slate-600">{option.label}</span>
                        <span className="w-10 shrink-0 text-right text-sm text-slate-500">{option.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{poll.voteCountLabel}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

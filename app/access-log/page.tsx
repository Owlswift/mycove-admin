'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { AccessLogEntry } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function AccessLogPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [entries, setEntries] = useState<AccessLogEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    apiFetch<AccessLogEntry[]>('/access-log')
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load access log.'));
  }, [user]);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-semibold text-slate-900">Access Log</h2>
          <p className="mt-1 text-sm text-slate-500">Visitor entries and exits recorded by security guards.</p>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

          {entries === null && !error && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

          {entries && entries.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No visitor entries recorded yet.</p>
          )}

          {entries && entries.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">Visitor</th>
                    <th className="px-4 py-3 font-medium">Visiting</th>
                    <th className="px-4 py-3 font-medium">Entered</th>
                    <th className="px-4 py-3 font-medium">Exited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{entry.visitor}</td>
                      <td className="px-4 py-3">
                        <a
                          href="/users"
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {entry.resident.fullName}
                        </a>
                        {entry.resident.house && (
                          <span className="ml-2 text-xs text-slate-500">{entry.resident.house}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(entry.entryAt)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {entry.exitAt ? (
                          formatDateTime(entry.exitAt)
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Still on-site
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

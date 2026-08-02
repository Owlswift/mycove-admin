'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

export default function NewPollPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [closesInDays, setClosesInDays] = useState(7);
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = options.map((o) => o.trim()).filter(Boolean);
    if (trimmed.length < 2) {
      setError('Add at least two options.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/polls', {
        method: 'POST',
        body: JSON.stringify({ question, closesInDays, options: trimmed }),
      });
      router.push('/polls');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create poll.');
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
          <Link href="/polls" className="text-sm font-medium text-accent hover:text-accent-hover">
            ← Back to polls
          </Link>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">New Poll</h2>
          <p className="mt-1 text-sm text-slate-500">Residents will be able to vote once created.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Question</label>
              <input
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Should we install speed bumps on the main road?"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Closes in (days)</label>
              <input
                type="number"
                required
                min={1}
                value={closesInDays}
                onChange={(e) => setClosesInDays(Number(e.target.value))}
                className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Options</label>
              <div className="mt-1 space-y-2">
                {options.map((option, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="shrink-0 rounded-md px-2 text-sm text-slate-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-sm font-medium text-accent2-hover hover:text-accent2"
              >
                + Add option
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create poll'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

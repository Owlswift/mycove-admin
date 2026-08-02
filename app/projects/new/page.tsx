'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';
import { readFileAsDataUrl } from '@/lib/read-file';

interface BudgetLine {
  label: string;
  amount: string;
}

export default function NewProjectPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [budget, setBudget] = useState<BudgetLine[]>([{ label: '', amount: '' }]);
  const [media, setMedia] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedia(await readFileAsDataUrl(file));
  }

  function updateBudgetLine(index: number, field: keyof BudgetLine, value: string) {
    setBudget((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function addBudgetLine() {
    setBudget((prev) => [...prev, { label: '', amount: '' }]);
  }

  function removeBudgetLine(index: number) {
    setBudget((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const lines = budget
      .map((b) => ({ label: b.label.trim(), amount: Number(b.amount) }))
      .filter((b) => b.label && b.amount > 0);
    if (lines.length === 0) {
      setError('Add at least one budget line.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ title, description, goal: Number(goal), budget: lines, mediaBase64: media ?? undefined }),
      });
      router.push('/projects');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create project.');
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
          <Link href="/projects" className="text-sm font-medium text-accent hover:text-accent-hover">
            ← Back to projects
          </Link>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">New Project</h2>
          <p className="mt-1 text-sm text-slate-500">Residents will see this in the app immediately.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Estate Road Resurfacing"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this project covers…"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Cover image or video <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="mt-1 w-full text-sm text-slate-600"
              />
              {media && <MediaPreview dataUrl={media} className="mt-2 h-40 w-full rounded-md object-cover" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Donation goal (₦)</label>
              <input
                type="number"
                required
                min={1}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-1 w-48 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Budget lines</label>
              <div className="mt-1 space-y-2">
                {budget.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={line.label}
                      onChange={(e) => updateBudgetLine(i, 'label', e.target.value)}
                      placeholder="e.g. Materials"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={1}
                      value={line.amount}
                      onChange={(e) => updateBudgetLine(i, 'amount', e.target.value)}
                      placeholder="Amount (₦)"
                      className="w-40 shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                    {budget.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBudgetLine(i)}
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
                onClick={addBudgetLine}
                className="mt-2 text-sm font-medium text-accent2-hover hover:text-accent2"
              >
                + Add budget line
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { SpotlightCategory } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';
import { readFileAsDataUrl } from '@/lib/read-file';

export default function NewSpotlightPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SpotlightCategory>('BUSINESS');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(await readFileAsDataUrl(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/spotlights', {
        method: 'POST',
        body: JSON.stringify({
          name,
          category,
          description,
          phone: phone.trim() || undefined,
          imageBase64: image ?? undefined,
        }),
      });
      router.push('/spotlights');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create spotlight.');
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
          <Link href="/spotlights" className="text-sm font-medium text-accent hover:text-accent-hover">
            ← Back to spotlights
          </Link>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">New Spotlight</h2>
          <p className="mt-1 text-sm text-slate-500">
            Creating this activates it automatically and shows it on the mobile home screen.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mrs. Adebayo's Bakery"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SpotlightCategory)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="BUSINESS">Business</option>
                <option value="PERSON">Person</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should residents know about them?"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Contact phone <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0803 123 4567"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Photo <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1 w-full text-sm text-slate-600"
              />
              {image && <MediaPreview dataUrl={image} className="mt-2 h-32 w-32 rounded-full object-cover" />}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create spotlight'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

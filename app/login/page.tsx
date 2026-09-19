'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { saveTokens } from '@/lib/auth';
import { identifyAdmin, trackAdmin } from '@/lib/analytics';

type AdminRole = 'ADMIN' | 'FINANCE_SECRETARY' | 'PROJECT_ADMIN' | 'CHAIRMAN';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('ADMIN');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await apiFetch<{ accessToken: string; refreshToken: string; user?: { id: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ phone, password, role }),
        },
      );
      saveTokens(result.accessToken, result.refreshToken);
      trackAdmin('admin_login_success', { role });
      if (result.user?.id) identifyAdmin({ adminId: result.user.id, adminRole: role });
      router.push('/');
    } catch (err) {
      trackAdmin('admin_login_failed', { role });
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-warm-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-divider bg-surface p-8 shadow-sm"
      >
        <Image src="/mycove-logo.png" alt="" width={36} height={36} />
        <h1 className="mt-4 text-xl font-semibold text-title">MyCove Admin</h1>
        <p className="mt-1 text-sm text-body">Sign in to manage resident and guard accounts.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Phone number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0800 000 0001"
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Signing in as</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="ADMIN">Admin</option>
              <option value="FINANCE_SECRETARY">Finance Secretary</option>
              <option value="PROJECT_ADMIN">Project Admin</option>
              <option value="CHAIRMAN">Chairman</option>
            </select>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}

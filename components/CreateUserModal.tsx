'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface Props {
  onClose: () => void;
  onCreated: (defaultPassword: string | null, fullName: string) => void;
}

export default function CreateUserModal({ onClose, onCreated }: Props) {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'RESIDENT' | 'GUARD' | 'FINANCE_SECRETARY' | 'PROJECT_ADMIN'>('RESIDENT');
  const [house, setHouse] = useState('');
  const [guardPassword, setGuardPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isGuard = role === 'GUARD';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await apiFetch<{ defaultPassword: string | null }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          fullName,
          role,
          house: house.trim() || undefined,
          password: isGuard ? guardPassword : undefined,
        }),
      });
      onCreated(result.defaultPassword, fullName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-slate-900">New account</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isGuard
            ? "Security guards share a duty phone, so there's no personal first-login setup — set their password directly below."
            : "A default password (their surname in caps) is generated automatically — share it with them, they'll be asked to change it on first login."}
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Phone number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0803 555 0142"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ifeoma Adebayo"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as 'RESIDENT' | 'GUARD' | 'FINANCE_SECRETARY' | 'PROJECT_ADMIN')
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="RESIDENT">Resident</option>
              <option value="GUARD">Security guard</option>
              <option value="FINANCE_SECRETARY">Finance Secretary</option>
              <option value="PROJECT_ADMIN">Project Admin</option>
            </select>
          </div>
          {isGuard && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="text"
                required
                minLength={6}
                value={guardPassword}
                onChange={(e) => setGuardPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              House address {role !== 'RESIDENT' && <span className="text-slate-400">(optional)</span>}
            </label>
            <input
              type="text"
              value={house}
              onChange={(e) => setHouse(e.target.value)}
              placeholder="e.g. Block C, Flat 4"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
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
  const [residentType, setResidentType] = useState<'REGULAR' | 'COMMERCIAL'>('REGULAR');
  const [occupancyType, setOccupancyType] = useState<'TENANT' | 'LANDLORD'>('TENANT');
  const [moveInMonth, setMoveInMonth] = useState('');
  const [streets, setStreets] = useState<string[]>([]);
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [guardPassword, setGuardPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isGuard = role === 'GUARD';
  // When the estate has preloaded streets the address is a street pick plus
  // a house number; otherwise it stays the original free-text field.
  const usesStreets = streets.length > 0;

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ streets: string[] }>('/estates/admin/streets')
      .then((r) => {
        if (!cancelled) setStreets(r.streets);
      })
      .catch(() => {
        // Non-fatal: fall back to the free-text house address.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          ...(role === 'RESIDENT' && { residentType, occupancyType, moveInMonth }),
          ...(usesStreets
            ? { street: street || undefined, houseNumber: houseNumber.trim() || undefined }
            : { house: house.trim() || undefined }),
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
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-title">New account</h2>
        <p className="mt-1 text-sm text-body">
          {isGuard
            ? "Security guards share a duty phone, so there's no personal first-login setup — set their password directly below."
            : "A default password (their surname in caps) is generated automatically — share it with them, they'll be asked to change it on first login."}
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Phone number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0803 555 0142"
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ifeoma Adebayo"
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Role</label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as 'RESIDENT' | 'GUARD' | 'FINANCE_SECRETARY' | 'PROJECT_ADMIN')
              }
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="RESIDENT">Resident</option>
              <option value="GUARD">Security guard</option>
              <option value="FINANCE_SECRETARY">Finance Secretary</option>
              <option value="PROJECT_ADMIN">Project Admin</option>
            </select>
          </div>
          {role === 'RESIDENT' && (
            <div>
              <label htmlFor="resident-type" className="block text-sm font-medium text-text">
                Resident type
              </label>
              <select
                id="resident-type"
                value={residentType}
                onChange={(e) => setResidentType(e.target.value as 'REGULAR' | 'COMMERCIAL')}
                className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="REGULAR">Regular resident</option>
                <option value="COMMERCIAL">Commercial (pays the commercial dues rate)</option>
              </select>
            </div>
          )}
          {role === 'RESIDENT' && (
            <div>
              <label htmlFor="occupancy-type" className="block text-sm font-medium text-text">
                Tenant or landlord
              </label>
              <select
                id="occupancy-type"
                value={occupancyType}
                onChange={(e) => setOccupancyType(e.target.value as 'TENANT' | 'LANDLORD')}
                className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="TENANT">Tenant</option>
                <option value="LANDLORD">Landlord (owns the unit)</option>
              </select>
            </div>
          )}
          {role === 'RESIDENT' && (
            <div>
              <label htmlFor="move-in-month" className="block text-sm font-medium text-text">
                Moved in (or started operating)
              </label>
              <input
                id="move-in-month"
                type="month"
                required
                max={new Date().toISOString().slice(0, 7)}
                value={moveInMonth}
                onChange={(e) => setMoveInMonth(e.target.value)}
                className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-xs text-body">Month and year. Dues are billed from this month.</p>
            </div>
          )}
          {isGuard && (
            <div>
              <label className="block text-sm font-medium text-text">Password</label>
              <input
                type="text"
                required
                minLength={6}
                value={guardPassword}
                onChange={(e) => setGuardPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          )}
          {usesStreets ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text">
                  Street {role !== 'RESIDENT' && <span className="text-body/70">(optional)</span>}
                </label>
                <select
                  required={role === 'RESIDENT'}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">Select a street</option>
                  {streets.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text">House no.</label>
                <input
                  type="text"
                  required={role === 'RESIDENT' || street !== ''}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="e.g. 12"
                  className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-text">
                House address {role !== 'RESIDENT' && <span className="text-body/70">(optional)</span>}
              </label>
              <input
                type="text"
                value={house}
                onChange={(e) => setHouse(e.target.value)}
                placeholder="e.g. Block C, Flat 4"
                className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-body hover:bg-accent-soft"
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

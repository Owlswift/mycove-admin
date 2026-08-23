'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

interface EstateEmergencyContacts {
  securityGuardPhone: string | null;
  estateAdminPhone: string | null;
}

/**
 * Estate-level contact numbers shown on every resident's SOS screen.
 * Before these were admin-editable the mobile app hardcoded placeholder
 * numbers — this page is where real ones get set (and later corrected).
 */
export default function EstateSettingsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [contacts, setContacts] = useState<EstateEmergencyContacts | null>(null);
  const [securityGuardPhone, setSecurityGuardPhone] = useState('');
  const [estateAdminPhone, setEstateAdminPhone] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<EstateEmergencyContacts>('/estates/admin/emergency-contacts');
      setContacts(result);
      setSecurityGuardPhone(result.securityGuardPhone ?? '');
      setEstateAdminPhone(result.estateAdminPhone ?? '');
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load emergency contacts.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN') void load();
  }, [user, load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    setSavedMsg('');
    setSaving(true);
    try {
      // '' clears a number server-side (see EstatesService.updateEmergencyContacts).
      await apiFetch('/estates/admin/emergency-contacts', {
        method: 'PATCH',
        body: JSON.stringify({
          securityGuardPhone: securityGuardPhone.trim(),
          estateAdminPhone: estateAdminPhone.trim(),
        }),
      });
      setSavedMsg('Emergency contacts saved.');
      void load();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save emergency contacts.');
    } finally {
      setSaving(false);
    }
  }

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Estate Settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Contact numbers every resident sees on their SOS / emergency screen.
            </p>
          </div>

          {loadError && (
            <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>
          )}

          {contacts !== null && (
            <form onSubmit={handleSave} className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-5">
              <div>
                <label htmlFor="security-guard-phone" className="block text-sm font-medium text-slate-700">
                  Security guard phone
                </label>
                <p className="mb-2 mt-0.5 text-xs text-slate-500">
                  The estate security desk duty number residents can reach in an emergency.
                </p>
                <input
                  id="security-guard-phone"
                  type="tel"
                  value={securityGuardPhone}
                  onChange={(e) => setSecurityGuardPhone(e.target.value)}
                  placeholder="e.g. 0800 123 4567"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label htmlFor="estate-admin-phone" className="block text-sm font-medium text-slate-700">
                  Estate admin phone
                </label>
                <p className="mb-2 mt-0.5 text-xs text-slate-500">
                  The management office number for non-emergency enquiries.
                </p>
                <input
                  id="estate-admin-phone"
                  type="tel"
                  value={estateAdminPhone}
                  onChange={(e) => setEstateAdminPhone(e.target.value)}
                  placeholder="e.g. 0800 765 4321"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              {savedMsg && <p className="text-sm text-green-700">{savedMsg}</p>}

              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save contacts'}
              </button>
            </form>
          )}

          {contacts === null && !loadError && (
            <p className="mt-6 text-sm text-slate-500">Loading…</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

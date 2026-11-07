'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';
import TokenChargingCard from '@/components/TokenChargingCard';

interface EstateEmergencyContacts {
  securityGuardPhone: string | null;
  estateAdminPhone: string | null;
}

interface EstateStreets {
  streets: string[];
}

interface PassRestriction {
  passRestrictionMonths: number | null;
}

interface GateAccessSettings {
  gateAccessRestrictionAmount: number | null;
  gateApiKey: string | null;
}

/**
 * Estate-level settings: the contact numbers shown on every resident's SOS
 * screen, the preloaded street list residents pick their address from, and
 * the dues policy for visitor passes. Before the contacts were admin-editable
 * the mobile app hardcoded placeholder numbers — this page is where real
 * ones get set (and later corrected).
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

  const [streetsText, setStreetsText] = useState('');
  const [streetsLoaded, setStreetsLoaded] = useState(false);
  const [streetsError, setStreetsError] = useState('');
  const [streetsSaved, setStreetsSaved] = useState('');
  const [savingStreets, setSavingStreets] = useState(false);

  const [restrictPasses, setRestrictPasses] = useState(true);
  const [restrictMonths, setRestrictMonths] = useState('2');
  const [restrictionLoaded, setRestrictionLoaded] = useState(false);
  const [restrictionError, setRestrictionError] = useState('');
  const [restrictionSaved, setRestrictionSaved] = useState('');
  const [savingRestriction, setSavingRestriction] = useState(false);

  const [gateEnabled, setGateEnabled] = useState(false);
  const [gateAmount, setGateAmount] = useState('0');
  const [gateApiKey, setGateApiKey] = useState<string | null>(null);
  const [gateLoaded, setGateLoaded] = useState(false);
  const [gateError, setGateError] = useState('');
  const [gateSaved, setGateSaved] = useState('');
  const [savingGate, setSavingGate] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [showGateApiKey, setShowGateApiKey] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<EstateEmergencyContacts>('/estates/admin/emergency-contacts');
      setContacts(result);
      setSecurityGuardPhone(result.securityGuardPhone ?? '');
      setEstateAdminPhone(result.estateAdminPhone ?? '');
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load emergency contacts.');
    }

    try {
      const result = await apiFetch<EstateStreets>('/estates/admin/streets');
      setStreetsText(result.streets.join('\n'));
      setStreetsLoaded(true);
    } catch (err) {
      setStreetsError(err instanceof ApiError ? err.message : 'Failed to load streets.');
    }

    try {
      const result = await apiFetch<PassRestriction>('/estates/admin/pass-restriction');
      setRestrictPasses(result.passRestrictionMonths !== null);
      setRestrictMonths(String(result.passRestrictionMonths ?? 2));
      setRestrictionLoaded(true);
    } catch (err) {
      setRestrictionError(err instanceof ApiError ? err.message : 'Failed to load the pass restriction.');
    }

    try {
      const result = await apiFetch<GateAccessSettings>('/estates/admin/gate-access');
      setGateEnabled(result.gateAccessRestrictionAmount !== null);
      setGateAmount(String(result.gateAccessRestrictionAmount ?? 0));
      setGateApiKey(result.gateApiKey);
      setGateLoaded(true);
    } catch (err) {
      setGateError(err instanceof ApiError ? err.message : 'Failed to load gate access settings.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN' || user?.role === 'CHAIRMAN') void load();
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

  async function handleSaveStreets(e: React.FormEvent) {
    e.preventDefault();
    setStreetsError('');
    setStreetsSaved('');
    setSavingStreets(true);
    try {
      const streets = streetsText.split('\n').map((line) => line.trim()).filter(Boolean);
      const result = await apiFetch<EstateStreets>('/estates/admin/streets', {
        method: 'PATCH',
        body: JSON.stringify({ streets }),
      });
      // The server de-duplicates and tidies spacing — show what was really stored.
      setStreetsText(result.streets.join('\n'));
      setStreetsSaved(`Saved ${result.streets.length} ${result.streets.length === 1 ? 'street' : 'streets'}.`);
    } catch (err) {
      setStreetsError(err instanceof ApiError ? err.message : 'Failed to save streets.');
    } finally {
      setSavingStreets(false);
    }
  }

  async function handleSaveRestriction(e: React.FormEvent) {
    e.preventDefault();
    setRestrictionError('');
    setRestrictionSaved('');
    const months = Number(restrictMonths);
    if (restrictPasses && (!Number.isInteger(months) || months < 0 || months > 12)) {
      setRestrictionError('Enter a whole number of months between 0 and 12.');
      return;
    }
    setSavingRestriction(true);
    try {
      await apiFetch('/estates/admin/pass-restriction', {
        method: 'PATCH',
        body: JSON.stringify({ passRestrictionMonths: restrictPasses ? months : null }),
      });
      setRestrictionSaved('Visitor pass policy saved.');
    } catch (err) {
      setRestrictionError(err instanceof ApiError ? err.message : 'Failed to save the visitor pass policy.');
    } finally {
      setSavingRestriction(false);
    }
  }

  async function handleSaveGateAccess(e: React.FormEvent) {
    e.preventDefault();
    setGateError('');
    setGateSaved('');
    const amount = Number(gateAmount);
    if (gateEnabled && (!Number.isInteger(amount) || amount < 0)) {
      setGateError('Enter a whole number of naira, 0 or more.');
      return;
    }
    setSavingGate(true);
    try {
      await apiFetch('/estates/admin/gate-access', {
        method: 'PATCH',
        body: JSON.stringify({ gateAccessRestrictionAmount: gateEnabled ? amount : null }),
      });
      setGateSaved('Gate access policy saved.');
    } catch (err) {
      setGateError(err instanceof ApiError ? err.message : 'Failed to save the gate access policy.');
    } finally {
      setSavingGate(false);
    }
  }

  async function handleRegenerateApiKey() {
    if (gateApiKey && !window.confirm('Regenerating replaces the current key — any gate hardware already configured with it will stop working until updated. Continue?')) {
      return;
    }
    setGateError('');
    setGateSaved('');
    setRegeneratingKey(true);
    try {
      const result = await apiFetch<{ gateApiKey: string }>('/estates/admin/gate-access/api-key/regenerate', {
        method: 'POST',
      });
      setGateApiKey(result.gateApiKey);
      setShowGateApiKey(true);
      setGateSaved('New API key generated. Update your gate hardware with it.');
    } catch (err) {
      setGateError(err instanceof ApiError ? err.message : 'Failed to generate an API key.');
    } finally {
      setRegeneratingKey(false);
    }
  }

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div>
            <h2 className="text-xl font-semibold text-title">Estate Settings</h2>
            <p className="mt-1 text-sm text-body">
              Contact numbers, the street list residents choose their address from, and your
              visitor pass policy.
            </p>
          </div>

          {user.estateCode && (
            <div className="mt-6 rounded-lg border border-divider bg-surface p-5">
              <h3 className="text-sm font-medium text-text">Estate access code</h3>
              <p className="mt-0.5 text-xs text-body">
                New residents enter this when they first open the app, before they can log in. Share it
                with anyone joining the estate.
              </p>
              <code className="mt-2 inline-block rounded-md border border-divider bg-divider/30 px-3 py-1.5 text-sm font-semibold tracking-wide text-title">
                {user.estateCode}
              </code>
            </div>
          )}

          {loadError && (
            <p className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{loadError}</p>
          )}

          {contacts !== null && (
            <form onSubmit={handleSave} className="mt-6 space-y-5 rounded-lg border border-divider bg-surface p-5">
              <div>
                <label htmlFor="security-guard-phone" className="block text-sm font-medium text-text">
                  Security guard phone
                </label>
                <p className="mb-2 mt-0.5 text-xs text-body">
                  The estate security desk duty number residents can reach in an emergency.
                </p>
                <input
                  id="security-guard-phone"
                  type="tel"
                  value={securityGuardPhone}
                  onChange={(e) => setSecurityGuardPhone(e.target.value)}
                  placeholder="e.g. 0800 123 4567"
                  className="w-full rounded-md border border-divider px-3 py-2 text-sm text-title focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label htmlFor="estate-admin-phone" className="block text-sm font-medium text-text">
                  Estate admin phone
                </label>
                <p className="mb-2 mt-0.5 text-xs text-body">
                  The management office number for non-emergency enquiries.
                </p>
                <input
                  id="estate-admin-phone"
                  type="tel"
                  value={estateAdminPhone}
                  onChange={(e) => setEstateAdminPhone(e.target.value)}
                  placeholder="e.g. 0800 765 4321"
                  className="w-full rounded-md border border-divider px-3 py-2 text-sm text-title focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {saveError && <p className="text-sm text-danger">{saveError}</p>}
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

          {streetsLoaded && (
            <form onSubmit={handleSaveStreets} className="mt-6 space-y-3 rounded-lg border border-divider bg-surface p-5">
              <div>
                <label htmlFor="streets" className="block text-sm font-medium text-text">
                  Estate streets
                </label>
                <p className="mb-2 mt-0.5 text-xs text-body">
                  One street name per line. Residents pick their street from this list and only type
                  their house number. Leave it empty to keep using a free-text house address.
                </p>
                <textarea
                  id="streets"
                  rows={8}
                  value={streetsText}
                  onChange={(e) => setStreetsText(e.target.value)}
                  placeholder={'Palm Street\nOlive Close\nGarden Avenue'}
                  className="w-full rounded-md border border-divider px-3 py-2 text-sm text-title focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {streetsError && <p className="text-sm text-danger">{streetsError}</p>}
              {streetsSaved && <p className="text-sm text-green-700">{streetsSaved}</p>}

              <button
                type="submit"
                disabled={savingStreets}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {savingStreets ? 'Saving…' : 'Save streets'}
              </button>
            </form>
          )}
          {!streetsLoaded && streetsError && (
            <p className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{streetsError}</p>
          )}

          {restrictionLoaded && (
            <form
              onSubmit={handleSaveRestriction}
              className="mt-6 space-y-4 rounded-lg border border-divider bg-surface p-5"
            >
              <div>
                <h3 className="text-sm font-medium text-text">Visitor passes &amp; outstanding dues</h3>
                <p className="mt-0.5 text-xs text-body">
                  A resident owing more than the limit below is asked to pay their outstanding dues when
                  they try to generate a visitor pass, and can&apos;t continue until they do.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={restrictPasses}
                  onChange={(e) => setRestrictPasses(e.target.checked)}
                />
                Block visitor passes for residents owing dues
              </label>

              {restrictPasses && (
                <div>
                  <label htmlFor="restrict-months" className="block text-sm font-medium text-text">
                    Months owing before passes are blocked
                  </label>
                  <p className="mb-2 mt-0.5 text-xs text-body">
                    With 2, a resident who owes 3 or more months is blocked; owing 2 is still fine.
                  </p>
                  <input
                    id="restrict-months"
                    type="number"
                    min={0}
                    max={12}
                    step={1}
                    value={restrictMonths}
                    onChange={(e) => setRestrictMonths(e.target.value)}
                    className="w-28 rounded-md border border-divider px-3 py-2 text-sm text-title focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}

              {restrictionError && <p className="text-sm text-danger">{restrictionError}</p>}
              {restrictionSaved && <p className="text-sm text-green-700">{restrictionSaved}</p>}

              <button
                type="submit"
                disabled={savingRestriction}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {savingRestriction ? 'Saving…' : 'Save policy'}
              </button>
            </form>
          )}
          {!restrictionLoaded && restrictionError && (
            <p className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{restrictionError}</p>
          )}

          {gateLoaded && (
            <form
              onSubmit={handleSaveGateAccess}
              className="mt-6 space-y-4 rounded-lg border border-divider bg-surface p-5"
            >
              <div>
                <h3 className="text-sm font-medium text-text">Gate access</h3>
                <p className="mt-0.5 text-xs text-body">
                  Lets your vehicle gate hardware check a resident&apos;s outstanding dues (by their{' '}
                  <span className="font-medium">RFID tag</span>, set on each resident&apos;s profile page) and deny
                  entry automatically when they owe more than the limit below. The resident is notified the moment
                  they&apos;re denied.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={gateEnabled}
                  onChange={(e) => setGateEnabled(e.target.checked)}
                />
                Deny gate access to residents owing dues
              </label>

              {gateEnabled && (
                <div>
                  <label htmlFor="gate-amount" className="block text-sm font-medium text-text">
                    Outstanding balance limit (₦)
                  </label>
                  <p className="mb-2 mt-0.5 text-xs text-body">
                    A resident owing more than this is denied at the gate; owing up to this amount is still let in.
                  </p>
                  <input
                    id="gate-amount"
                    type="number"
                    min={0}
                    step={1}
                    value={gateAmount}
                    onChange={(e) => setGateAmount(e.target.value)}
                    className="w-40 rounded-md border border-divider px-3 py-2 text-sm text-title focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}

              {gateError && <p className="text-sm text-danger">{gateError}</p>}
              {gateSaved && <p className="text-sm text-green-700">{gateSaved}</p>}

              <button
                type="submit"
                disabled={savingGate}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {savingGate ? 'Saving…' : 'Save policy'}
              </button>

              <div className="border-t border-divider pt-4">
                <p className="text-sm font-medium text-text">Gate hardware API key</p>
                <p className="mb-2 mt-0.5 text-xs text-body">
                  Give this to whoever configures your gate hardware — they send it as the{' '}
                  <code className="rounded bg-divider/60 px-1 py-0.5 text-xs">X-Api-Key</code> header when calling{' '}
                  <code className="rounded bg-divider/60 px-1 py-0.5 text-xs">POST /gate-access/check</code>.
                </p>
                {gateApiKey ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md border border-divider bg-divider/30 px-3 py-1.5 text-xs text-title">
                      {showGateApiKey ? gateApiKey : '•'.repeat(24)}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowGateApiKey((v) => !v)}
                      className="rounded-md border border-divider px-3 py-1.5 text-xs font-medium text-body hover:bg-divider/40"
                    >
                      {showGateApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-body">No key generated yet.</p>
                )}
                <button
                  type="button"
                  onClick={handleRegenerateApiKey}
                  disabled={regeneratingKey}
                  className="mt-3 rounded-md border border-divider px-4 py-1.5 text-sm font-medium text-body hover:bg-divider/40 disabled:opacity-50"
                >
                  {regeneratingKey ? 'Generating…' : gateApiKey ? 'Regenerate key' : 'Generate key'}
                </button>
              </div>
            </form>
          )}
          {!gateLoaded && gateError && (
            <p className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{gateError}</p>
          )}

          <TokenChargingCard />

          {contacts === null && !loadError && (
            <p className="mt-6 text-sm text-body">Loading…</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

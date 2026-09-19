'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface TokenSettings {
  tokenChargingEnabled: boolean;
  tokenAllowanceRegular: number;
  tokenAllowanceCommercial: number;
  tokenPriceRegular: number;
  tokenPriceCommercial: number;
}

/**
 * Extra visitor tokens: how many a resident gets free each day and what each
 * one after that costs (taken from their wallet). Regular and commercial
 * residents each have their own numbers. Whether this is switched on for
 * the estate is the platform's decision — until it is, these figures are
 * kept but nothing is charged.
 */
export default function TokenChargingCard() {
  const [settings, setSettings] = useState<TokenSettings | null>(null);
  const [form, setForm] = useState({ ar: '', ac: '', pr: '', pc: '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

  function fill(s: TokenSettings) {
    setSettings(s);
    setForm({
      ar: String(s.tokenAllowanceRegular),
      ac: String(s.tokenAllowanceCommercial),
      pr: String(s.tokenPriceRegular),
      pc: String(s.tokenPriceCommercial),
    });
  }

  useEffect(() => {
    apiFetch<TokenSettings>('/estates/admin/token-charging')
      .then(fill)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load token settings.'));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved('');
    const values = [form.ar, form.ac, form.pr, form.pc].map(Number);
    if (values.some((v) => !Number.isInteger(v) || v < 0)) {
      setError('Enter whole numbers, zero or more.');
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<TokenSettings>('/estates/admin/token-charging', {
        method: 'PATCH',
        body: JSON.stringify({
          tokenAllowanceRegular: values[0],
          tokenAllowanceCommercial: values[1],
          tokenPriceRegular: values[2],
          tokenPriceCommercial: values[3],
        }),
      });
      fill(result);
      setSaved('Saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save token settings.');
    } finally {
      setSaving(false);
    }
  }

  if (settings === null) {
    return error ? <p className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null;
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none';

  return (
    <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-lg border border-divider bg-surface p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-title">Extra visitor tokens</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              settings.tokenChargingEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {settings.tokenChargingEnabled ? 'Active' : 'Not active'}
          </span>
        </div>
        <p className="mt-1 text-sm text-body">
          Residents get a number of free visitor tokens each day. After that, each extra token is charged to their
          wallet at the price below, and they are asked to agree first. A price of 0 keeps extra tokens free.
        </p>
        {!settings.tokenChargingEnabled && (
          <p className="mt-2 text-sm text-amber-800">
            This isn&apos;t switched on for your estate, so no one is charged yet. Contact MyCove to activate it. You
            can set your figures now.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="token-allowance-regular" className="block text-sm font-medium text-text">
            Regular residents: free tokens per day
          </label>
          <input id="token-allowance-regular" type="number" min={0} value={form.ar} onChange={(e) => setForm({ ...form, ar: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor="token-price-regular" className="block text-sm font-medium text-text">
            Regular residents: price per extra token (₦)
          </label>
          <input id="token-price-regular" type="number" min={0} value={form.pr} onChange={(e) => setForm({ ...form, pr: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor="token-allowance-commercial" className="block text-sm font-medium text-text">
            Commercial residents: free tokens per day
          </label>
          <input id="token-allowance-commercial" type="number" min={0} value={form.ac} onChange={(e) => setForm({ ...form, ac: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor="token-price-commercial" className="block text-sm font-medium text-text">
            Commercial residents: price per extra token (₦)
          </label>
          <input id="token-price-commercial" type="number" min={0} value={form.pc} onChange={(e) => setForm({ ...form, pc: e.target.value })} className={inputClass} />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-green-700">{saved}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save token settings'}
      </button>
    </form>
  );
}

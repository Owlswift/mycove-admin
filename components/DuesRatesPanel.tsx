'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { formatMonthKey, nextMonthKey } from '@/lib/months';
import { DuesRateRecord, DuesRates, RESIDENT_TYPE_LABELS, ResidentType } from '@/lib/types';
import { usePaginatedList } from '@/lib/use-paginated-list';
import Pagination from '@/components/Pagination';

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

type RateStatus = 'Current' | 'Upcoming' | 'Replaced';

/** Which of a type's rate entries is in force this month, which are still to come, and which have been superseded. */
function statusOf(rate: DuesRateRecord, all: DuesRateRecord[], currentMonth: string): RateStatus {
  if (rate.effectiveMonth > currentMonth) return 'Upcoming';
  const inForce = all
    .filter((r) => r.residentType === rate.residentType && r.effectiveMonth <= currentMonth)
    .sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth) || a.createdAt.localeCompare(b.createdAt))
    .at(-1);
  return inForce?.id === rate.id ? 'Current' : 'Replaced';
}

const STATUS_STYLES: Record<RateStatus, string> = {
  Current: 'bg-green-100 text-green-800',
  Upcoming: 'bg-amber-100 text-amber-800',
  Replaced: 'bg-divider text-body',
};

function RateCard({
  type,
  rates,
}: {
  type: ResidentType;
  rates: DuesRates;
}) {
  const current = rates.current[type];
  const upcoming = rates.rates
    .filter((r) => r.residentType === type && r.effectiveMonth > rates.currentMonth)
    .sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));

  return (
    <div className="rounded-lg border border-divider bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-body">{RESIDENT_TYPE_LABELS[type]} residents</p>
      {current ? (
        <>
          <p className="mt-1 text-lg font-semibold text-title">
            {formatMoney(current.monthlyAmount)}
            <span className="text-sm font-normal text-body"> / month</span>
          </p>
          <p className="mt-0.5 text-xs text-body">
            {current.usesRegularRate
              ? 'Billed at the regular rate — no separate rate set yet.'
              : current.effectiveMonth < '2010-01'
                ? 'In effect from the start.'
                : `In effect since ${formatMonthKey(current.effectiveMonth)}.`}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-body">Not set yet.</p>
      )}
      {upcoming.map((u) => (
        <p key={u.id} className="mt-1 text-xs font-medium text-amber-800">
          Changes to {formatMoney(u.monthlyAmount)} from {formatMonthKey(u.effectiveMonth)}.
        </p>
      ))}
    </div>
  );
}

/**
 * The estate's dues rates — what regular and commercial residents each pay
 * per month, plus the full history of every rate ever set (when it took
 * effect, when it was entered, and by whom). Only the finance secretary can
 * change a rate; a change starts at the month chosen and never rewrites
 * earlier months.
 */
export default function DuesRatesPanel({
  canEdit,
  onChanged,
}: {
  canEdit: boolean;
  onChanged?: () => void;
}) {
  const [rates, setRates] = useState<DuesRates | null>(null);
  const [error, setError] = useState('');

  const [type, setType] = useState<ResidentType>('REGULAR');
  const [amount, setAmount] = useState('');
  const [effective, setEffective] = useState(nextMonthKey());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    try {
      setRates(await apiFetch<DuesRates>('/finance/dues-rates'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dues rates.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const history = useMemo(
    () =>
      rates
        ? [...rates.rates].sort(
            (a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth) || b.createdAt.localeCompare(a.createdAt),
          )
        : [],
    [rates],
  );
  const { page, setPage, totalPages, pageItems } = usePaginatedList(history, 5);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    setSaved('');
    const monthlyAmount = Number(amount);
    if (!Number.isInteger(monthlyAmount) || monthlyAmount <= 0) {
      setSaveError('Enter the monthly amount as a whole number of naira.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(effective)) {
      setSaveError('Choose the month the new rate starts.');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<DuesRates>('/finance/dues-rates', {
        method: 'POST',
        body: JSON.stringify({ residentType: type, monthlyAmount, effectiveMonth: effective }),
      });
      setRates(updated);
      setAmount('');
      setSaved(
        `${RESIDENT_TYPE_LABELS[type]} rate set to ${formatMoney(monthlyAmount)} from ${formatMonthKey(effective)}.`,
      );
      onChanged?.();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save the rate.');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="mt-6 text-sm text-danger">{error}</p>;
  if (!rates) return <p className="mt-6 text-sm text-body">Loading rates…</p>;

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-body">Dues rates</h3>
      <p className="mt-1 text-sm text-body">
        Regular and commercial residents each pay their own monthly amount. A change applies from the month you choose
        onward — earlier months keep the rate they had.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RateCard type="REGULAR" rates={rates} />
        <RateCard type="COMMERCIAL" rates={rates} />
      </div>

      {canEdit && (
        <form onSubmit={handleSave} className="mt-4 rounded-lg border border-divider bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-body">Change a rate</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="rate-type" className="block text-xs text-body">
                Resident type
              </label>
              <select
                id="rate-type"
                value={type}
                onChange={(e) => setType(e.target.value as ResidentType)}
                className="mt-1 rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="REGULAR">Regular</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
            </div>
            <div>
              <label htmlFor="rate-amount" className="block text-xs text-body">
                New monthly amount (₦)
              </label>
              <input
                id="rate-amount"
                type="number"
                required
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-40 rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="rate-effective" className="block text-xs text-body">
                Takes effect from
              </label>
              <input
                id="rate-effective"
                type="month"
                required
                value={effective}
                onChange={(e) => setEffective(e.target.value)}
                className="mt-1 rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save rate'}
            </button>
          </div>
          <p className="mt-2 text-xs text-body">
            Starts next month by default. Pick an earlier month only to record a rate from before the app, so past
            months can be worked out correctly.
          </p>
          {saveError && <p className="mt-2 text-sm text-danger">{saveError}</p>}
          {saved && <p className="mt-2 text-sm text-green-700">{saved}</p>}
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-divider bg-surface">
        <table className="min-w-full divide-y divide-divider text-sm">
          <caption className="px-4 pt-3 text-left text-xs font-medium uppercase tracking-wide text-body">
            Rate history
          </caption>
          <thead>
            <tr className="text-left text-body">
              <th className="px-4 py-3 font-medium">Resident type</th>
              <th className="px-4 py-3 font-medium">Monthly amount</th>
              <th className="px-4 py-3 font-medium">Takes effect</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recorded on</th>
              <th className="px-4 py-3 font-medium">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {pageItems.map((r) => {
              const status = statusOf(r, rates.rates, rates.currentMonth);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-title">{RESIDENT_TYPE_LABELS[r.residentType]}</td>
                  <td className="px-4 py-3 font-medium text-title">{formatMoney(r.monthlyAmount)}</td>
                  <td className="px-4 py-3 text-body">
                    {r.effectiveMonth < '2010-01' ? 'From the start' : formatMonthKey(r.effectiveMonth)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>
                  </td>
                  <td className="px-4 py-3 text-body">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3 text-body">{r.createdBy?.fullName ?? 'Carried over from earlier setup'}</td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-body">
                  No rates set yet — residents won&apos;t accrue any dues until one is.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-divider px-4 py-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalLabel={`${history.length} rate${history.length === 1 ? '' : 's'} on record`}
          />
        </div>
      </div>
    </section>
  );
}

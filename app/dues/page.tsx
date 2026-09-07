'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { downloadCsv } from '@/lib/csv-export';
import { DuesRoster, ResidentDues } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';
import RecordDuesPaymentModal from '@/components/RecordDuesPaymentModal';
import SearchInput from '@/components/SearchInput';

type DuesStatusFilter = 'ALL' | 'OWING' | 'PAID';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + 1 - i);

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-divider bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-body">{label}</p>
      <p className="mt-1 text-lg font-semibold text-title">{value}</p>
    </div>
  );
}

export default function DuesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [roster, setRoster] = useState<DuesRoster | null>(null);
  const [error, setError] = useState('');

  const [rateInput, setRateInput] = useState('');
  const [rateError, setRateError] = useState('');
  const [rateSuccess, setRateSuccess] = useState(false);
  const [rateSaving, setRateSaving] = useState(false);

  const [recordingFor, setRecordingFor] = useState<ResidentDues | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DuesStatusFilter>('ALL');

  const isFinanceSecretary = user?.role === 'FINANCE_SECRETARY';
  // Recording an off-platform payment (cash, bank transfer) is a
  // reconciliation task, not a rate-setting one — Admin needs it too since
  // automated account/payment setup can lag behind a resident actually
  // paying, unlike the dues-rate control below which stays Finance-only.
  const canRecordPayment = user?.role === 'ADMIN' || user?.role === 'FINANCE_SECRETARY';

  const load = useCallback(async (forYear: number) => {
    try {
      const result = await apiFetch<DuesRoster>(`/finance/dues?year=${forYear}`);
      setRoster(result);
      setRateInput(result.monthlyAmount !== null ? String(result.monthlyAmount) : '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dues status.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN' || user?.role === 'FINANCE_SECRETARY') void load(year);
  }, [user, year, load]);

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    setRateError('');
    setRateSuccess(false);
    setRateSaving(true);
    try {
      await apiFetch('/finance/dues-rate', {
        method: 'POST',
        body: JSON.stringify({ monthlyAmount: Number(rateInput) }),
      });
      setRateSuccess(true);
      void load(year);
    } catch (err) {
      setRateError(err instanceof ApiError ? err.message : 'Failed to update dues rate.');
    } finally {
      setRateSaving(false);
    }
  }

  const residents = roster ? [...roster.residents].sort((a, b) => b.duesBalance - a.duesBalance) : null;

  const filtered = useMemo(() => {
    if (!residents) return [];
    const q = search.trim().toLowerCase();
    return residents.filter((r) => {
      if (statusFilter === 'OWING' && r.duesBalance <= 0) return false;
      if (statusFilter === 'PAID' && r.duesBalance > 0) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        (r.house?.toLowerCase().includes(q) ?? false) ||
        r.phone.toLowerCase().includes(q)
      );
    });
  }, [residents, search, statusFilter]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  function handleExport() {
    if (!residents) return;
    downloadCsv(
      `dues-${year}.csv`,
      [
        { key: 'fullName', label: 'Resident' },
        { key: 'house', label: 'House' },
        { key: 'phone', label: 'Phone' },
        { key: 'amountOwed', label: 'Amount Owed (NGN)' },
        { key: 'monthsPaid', label: 'Months Paid' },
        { key: 'status', label: 'Status' },
      ],
      residents.map((r) => ({
        fullName: r.fullName,
        house: r.house ?? '',
        phone: r.phone,
        amountOwed: r.duesBalance,
        monthsPaid: `${r.monthsPaid} of 12`,
        status: r.duesBalance > 0 ? 'Owing' : 'Paid up',
      })),
    );
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'FINANCE_SECRETARY']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-title">Dues</h2>
              <p className="mt-1 text-sm text-body">
                Who&apos;s paid and who hasn&apos;t. Dues are annual, payable in one lump sum or monthly —
                the balance below reflects what&apos;s accrued so far this fiscal year minus what&apos;s
                actually been paid.
              </p>
            </div>
            <div className="flex shrink-0 items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-body">Fiscal year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExport}
                disabled={!residents || residents.length === 0}
                className="rounded-md border border-divider px-3 py-1.5 text-sm font-medium text-text hover:bg-accent-soft disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}
          {roster === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}

          {roster && (
            <div className="mt-6 rounded-lg border border-divider bg-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-body">Dues rate</p>
              {isFinanceSecretary ? (
                <form onSubmit={handleSaveRate} className="mt-2 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-body">Monthly amount</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Not set yet"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="mt-1 w-40 rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                  <p className="pb-1.5 text-xs text-body">
                    {rateInput && !isNaN(Number(rateInput)) && `= ${formatMoney(Number(rateInput) * 12)}/year`}
                  </p>
                  <button
                    type="submit"
                    disabled={rateSaving || Number(rateInput) === roster.monthlyAmount}
                    className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    {rateSaving ? 'Saving…' : 'Save'}
                  </button>
                  {rateError && <p className="w-full text-sm text-danger">{rateError}</p>}
                  {rateSuccess && <p className="w-full text-sm text-green-700">Dues rate updated.</p>}
                  {roster.monthlyAmount === null && !rateSuccess && (
                    <p className="w-full text-xs text-body">
                      No rate set yet — residents won&apos;t accrue any dues until you save one.
                    </p>
                  )}
                </form>
              ) : roster.monthlyAmount === null ? (
                <p className="mt-1 text-sm text-body">Not set yet.</p>
              ) : (
                <p className="mt-1 text-lg font-semibold text-title">
                  {formatMoney(roster.monthlyAmount)}/month ({formatMoney(roster.monthlyAmount * 12)}/year)
                </p>
              )}
            </div>
          )}

          {roster && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <SummaryCard label={`Expected in ${year}`} value={formatMoney(roster.totals.expected)} />
              <SummaryCard label="Collected" value={formatMoney(roster.totals.collected)} />
              <SummaryCard label="Outstanding" value={formatMoney(roster.totals.outstanding)} />
            </div>
          )}

          {residents && residents.length === 0 && (
            <p className="mt-6 text-sm text-body">No residents yet.</p>
          )}

          {residents && residents.length > 0 && (
            <div className="mt-6 flex gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, house, phone…" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DuesStatusFilter)}
                className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="ALL">All</option>
                <option value="OWING">Owing</option>
                <option value="PAID">Paid up</option>
              </select>
            </div>
          )}

          {residents && residents.length > 0 && filtered.length === 0 && (
            <p className="mt-4 text-sm text-body">No residents match your search/filter.</p>
          )}

          {filtered.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-divider bg-surface">
              <table className="min-w-full divide-y divide-divider text-sm">
                <thead>
                  <tr className="text-left text-body">
                    <th className="px-4 py-3 font-medium">Resident</th>
                    <th className="px-4 py-3 font-medium">House</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Amount owed</th>
                    <th className="px-4 py-3 font-medium">Months paid</th>
                    {canRecordPayment && <th className="px-4 py-3 font-medium"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {pageItems.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-title">{r.fullName}</td>
                      <td className="px-4 py-3 text-body">{r.house ?? '—'}</td>
                      <td className="px-4 py-3 text-body">{r.phone}</td>
                      <td className="px-4 py-3">
                        {r.duesBalance > 0 ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            {formatMoney(r.duesBalance)} owed
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Paid up
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-body">{r.monthsPaid} of 12</td>
                      {canRecordPayment && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setRecordingFor(r)}
                            className="text-xs font-medium text-accent2 hover:text-accent2-hover"
                          >
                            Record payment
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-divider px-4 py-3">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalLabel={`${filtered.length} resident${filtered.length === 1 ? '' : 's'}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {recordingFor && (
        <RecordDuesPaymentModal
          residentId={recordingFor.id}
          residentName={recordingFor.fullName}
          onClose={() => setRecordingFor(null)}
          onRecorded={() => {
            setRecordingFor(null);
            void load(year);
          }}
        />
      )}
    </AppShell>
  );
}

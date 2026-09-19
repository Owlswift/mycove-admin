'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { downloadCsv } from '@/lib/csv-export';
import { formatMonthKey } from '@/lib/months';
import { DuesRoster, ResidentDues, RESIDENT_TYPE_LABELS } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import DuesRatesPanel from '@/components/DuesRatesPanel';
import Pagination from '@/components/Pagination';
import RecordDuesPaymentModal from '@/components/RecordDuesPaymentModal';
import SearchInput from '@/components/SearchInput';

type DuesStatusFilter = 'ALL' | 'OWING' | 'PAID';
type TypeFilter = 'ALL' | 'REGULAR' | 'COMMERCIAL';

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
  const [roster, setRoster] = useState<DuesRoster | null>(null);
  const [error, setError] = useState('');

  const [recordingFor, setRecordingFor] = useState<ResidentDues | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DuesStatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const isFinanceSecretary = user?.role === 'FINANCE_SECRETARY';
  // Recording an off-platform payment (cash, bank transfer) is a
  // reconciliation task, not a rate-setting one — Admin needs it too since
  // automated account/payment setup can lag behind a resident actually
  // paying, unlike changing the dues rates, which stays Finance-only.
  const canRecordPayment = user?.role === 'ADMIN' || user?.role === 'FINANCE_SECRETARY';

  const load = useCallback(async () => {
    try {
      setRoster(await apiFetch<DuesRoster>('/finance/dues'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dues status.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN' || user?.role === 'FINANCE_SECRETARY' || user?.role === 'CHAIRMAN') void load();
  }, [user, load]);

  const residents = roster ? [...roster.residents].sort((a, b) => b.duesBalance - a.duesBalance) : null;

  const filtered = useMemo(() => {
    if (!residents) return [];
    const q = search.trim().toLowerCase();
    return residents.filter((r) => {
      if (statusFilter === 'OWING' && r.duesBalance <= 0) return false;
      if (statusFilter === 'PAID' && r.duesBalance > 0) return false;
      if (typeFilter !== 'ALL' && r.residentType !== typeFilter) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        (r.house?.toLowerCase().includes(q) ?? false) ||
        r.phone.toLowerCase().includes(q)
      );
    });
  }, [residents, search, statusFilter, typeFilter]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  function handleExport() {
    if (!residents) return;
    downloadCsv(
      `dues-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: 'fullName', label: 'Resident' },
        { key: 'type', label: 'Type' },
        { key: 'house', label: 'House' },
        { key: 'phone', label: 'Phone' },
        { key: 'billingFrom', label: 'Billing From' },
        { key: 'moveInRecorded', label: 'Move-in Recorded' },
        { key: 'amountOwed', label: 'Amount Owed (NGN)' },
        { key: 'monthsOwed', label: 'Months Owed' },
        { key: 'status', label: 'Status' },
      ],
      residents.map((r) => ({
        fullName: r.fullName,
        type: RESIDENT_TYPE_LABELS[r.residentType],
        house: r.house ?? '',
        phone: r.phone,
        billingFrom: formatMonthKey(r.billingStart),
        moveInRecorded: r.moveInMonth ? 'Yes' : 'No',
        amountOwed: r.duesBalance,
        monthsOwed: r.monthsOwed,
        status: r.duesBalance > 0 ? 'Owing' : 'Paid up',
      })),
    );
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'FINANCE_SECRETARY', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-title">Dues</h2>
              <p className="mt-1 max-w-2xl text-sm text-body">
                Each resident is billed every month from when their billing began, at the rate for their type. What
                they owe is everything billed so far minus everything they&apos;ve paid — in the app and before it.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {isFinanceSecretary && (
                <Link
                  href="/dues/import"
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Import past payments
                </Link>
              )}
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

          <DuesRatesPanel canEdit={isFinanceSecretary} onChanged={() => void load()} />

          {roster === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}

          {roster && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard label="Billed to date" value={formatMoney(roster.totals.expected)} />
              <SummaryCard label="Collected" value={formatMoney(roster.totals.collected)} />
              <SummaryCard label="Outstanding" value={formatMoney(roster.totals.outstanding)} />
            </div>
          )}

          {residents && residents.length === 0 && (
            <p className="mt-6 text-sm text-body">No residents yet.</p>
          )}

          {residents && residents.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, house, phone…" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DuesStatusFilter)}
                aria-label="Filter by payment status"
                className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="ALL">All</option>
                <option value="OWING">Owing</option>
                <option value="PAID">Paid up</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                aria-label="Filter by resident type"
                className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="ALL">All types</option>
                <option value="REGULAR">Regular</option>
                <option value="COMMERCIAL">Commercial</option>
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
                    <th className="px-4 py-3 font-medium">Billing from</th>
                    <th className="px-4 py-3 font-medium">Amount owed</th>
                    <th className="px-4 py-3 font-medium">Months paid</th>
                    {canRecordPayment && <th className="px-4 py-3 font-medium"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {pageItems.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-title">
                        {r.fullName}
                        {r.residentType === 'COMMERCIAL' && (
                          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-title">
                            Commercial
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-body">{r.house ?? '—'}</td>
                      <td className="px-4 py-3 text-body">{r.phone}</td>
                      <td className="px-4 py-3 text-body">
                        {formatMonthKey(r.billingStart)}
                        {!r.moveInMonth && <p className="text-xs text-amber-700">Move-in month not set</p>}
                      </td>
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
                      <td className="px-4 py-3 text-body">
                        {r.monthsPaid} of {r.monthsElapsed}
                      </td>
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
            void load();
          }}
        />
      )}
    </AppShell>
  );
}

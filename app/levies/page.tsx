'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { downloadCsv } from '@/lib/csv-export';
import { LevyRoster, LevyResidentStatus } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';
import RecordLevyPaymentModal from '@/components/RecordLevyPaymentModal';

interface MarkPaidTarget {
  levyId: string;
  levyLabel: string;
  residentId: string;
  residentName: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + 1 - i);

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function LeviesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [roster, setRoster] = useState<LevyRoster | null>(null);
  const [error, setError] = useState('');

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [levyYear, setLevyYear] = useState(CURRENT_YEAR);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<MarkPaidTarget | null>(null);

  const isFinanceSecretary = user?.role === 'FINANCE_SECRETARY';

  const load = useCallback(async (forYear: number) => {
    try {
      const result = await apiFetch<LevyRoster>(`/finance/levies?year=${forYear}`);
      setRoster(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load levies.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN' || user?.role === 'FINANCE_SECRETARY') void load(year);
  }, [user, year, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiFetch('/finance/levies', {
        method: 'POST',
        body: JSON.stringify({ label, amount: Number(amount), dueDate, year: levyYear }),
      });
      setLabel('');
      setAmount('');
      setDueDate('');
      if (levyYear !== year) setYear(levyYear);
      else void load(year);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create levy.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this levy? Payment records for it will be removed too.')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/finance/levies/${id}`, { method: 'DELETE' });
      void load(year);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete levy.');
    } finally {
      setDeletingId(null);
    }
  }

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  function handleExport() {
    if (!roster) return;
    const rows = roster.levies.flatMap((levy) =>
      levy.residents.map((r) => ({
        levy: levy.label,
        amount: levy.amount,
        dueDate: levy.dueDate,
        year: levy.year,
        resident: r.fullName,
        house: r.house ?? '',
        status: r.paid ? 'Paid' : 'Unpaid',
      })),
    );
    downloadCsv(
      `levies-${year}.csv`,
      [
        { key: 'levy', label: 'Levy' },
        { key: 'amount', label: 'Amount (NGN)' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'year', label: 'Fiscal Year' },
        { key: 'resident', label: 'Resident' },
        { key: 'house', label: 'House' },
        { key: 'status', label: 'Status' },
      ],
      rows,
    );
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'FINANCE_SECRETARY']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Levies</h2>
              <p className="mt-1 text-sm text-slate-500">
                One-off charges for a specific purpose (a security upgrade, a Christmas fund) — separate
                from the recurring annual dues.
              </p>
            </div>
            <div className="flex shrink-0 items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">Fiscal year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
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
                disabled={!roster || roster.levies.length === 0}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
          {roster === null && !error && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

          {roster && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <SummaryCard label={`Expected in ${year}`} value={formatMoney(roster.totals.expected)} />
              <SummaryCard label="Collected" value={formatMoney(roster.totals.collected)} />
              <SummaryCard label="Outstanding" value={formatMoney(roster.totals.outstanding)} />
            </div>
          )}

          {isFinanceSecretary && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">New Levy</h3>
              <form
                onSubmit={handleCreate}
                className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700">Label</label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Generator Fuel Levy"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Due date</label>
                  <input
                    type="text"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="e.g. 20 Sep"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Year</label>
                  <select
                    value={levyYear}
                    onChange={(e) => setLevyYear(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  {formError && <p className="mb-3 text-sm text-red-600">{formError}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    {submitting ? 'Creating…' : 'Create levy'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {roster && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Levies in {year}
              </h3>
              {roster.levies.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No levies raised in {year} yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {roster.levies.map((levy) => (
                    <div key={levy.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{levy.label}</p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {formatMoney(levy.amount)} per resident · due {levy.dueDate}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <span className="rounded-full bg-accent2-soft px-2 py-0.5 text-xs font-medium text-accent2-hover">
                            {levy.paidCount} of {levy.totalResidents} paid (
                            {levy.totalResidents > 0 ? Math.round((levy.paidCount / levy.totalResidents) * 100) : 0}%)
                          </span>
                          {isFinanceSecretary && (
                            <button
                              onClick={() => handleDelete(levy.id)}
                              disabled={deletingId === levy.id}
                              className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">Expected</span>{' '}
                          <span className="font-medium text-slate-900">
                            {formatMoney(levy.totalResidents * levy.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Collected</span>{' '}
                          <span className="font-medium text-green-700">{formatMoney(levy.collected)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Outstanding</span>{' '}
                          <span className="font-medium text-red-700">{formatMoney(levy.outstanding)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(expandedId === levy.id ? null : levy.id)}
                        className="mt-3 text-xs font-medium text-accent2 hover:text-accent2-hover"
                      >
                        {expandedId === levy.id ? 'Hide residents' : 'View residents'}
                      </button>
                      {expandedId === levy.id && (
                        <ResidentBreakdown
                          residents={levy.residents}
                          isFinanceSecretary={isFinanceSecretary}
                          onMarkPaid={(residentId, residentName) =>
                            setMarkPaidTarget({ levyId: levy.id, levyLabel: levy.label, residentId, residentName })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {markPaidTarget && (
        <RecordLevyPaymentModal
          levyId={markPaidTarget.levyId}
          levyLabel={markPaidTarget.levyLabel}
          residentId={markPaidTarget.residentId}
          residentName={markPaidTarget.residentName}
          onClose={() => setMarkPaidTarget(null)}
          onRecorded={() => {
            setMarkPaidTarget(null);
            void load(year);
          }}
        />
      )}
    </AppShell>
  );
}

function ResidentBreakdown({
  residents,
  isFinanceSecretary,
  onMarkPaid,
}: {
  residents: LevyResidentStatus[];
  isFinanceSecretary: boolean;
  onMarkPaid: (residentId: string, residentName: string) => void;
}) {
  const unpaid = residents.filter((r) => !r.paid);
  const paid = residents.filter((r) => r.paid);
  return (
    <div className="mt-3 rounded-md bg-slate-50 p-3">
      <div className="max-h-64 overflow-y-auto">
        <ul className="space-y-1.5 text-xs">
          {[...unpaid, ...paid].map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <span className="text-slate-700">
                {r.fullName}
                {r.house && <span className="text-slate-400"> · {r.house}</span>}
              </span>
              {r.paid ? (
                <div className="flex shrink-0 items-center gap-2">
                  {r.mediaBase64 && (
                    <MediaPreview dataUrl={r.mediaBase64} className="h-6 w-6 rounded object-cover" />
                  )}
                  <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">Paid</span>
                </div>
              ) : isFinanceSecretary ? (
                <button
                  onClick={() => onMarkPaid(r.id, r.fullName)}
                  className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 hover:bg-red-200"
                >
                  Unpaid — mark as paid
                </button>
              ) : (
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                  Unpaid
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

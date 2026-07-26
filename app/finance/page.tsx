'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Invoice, TreasurySummary } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export default function FinancePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState('');

  const [allocProjectId, setAllocProjectId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocNote, setAllocNote] = useState('');
  const [allocError, setAllocError] = useState('');
  const [allocLoading, setAllocLoading] = useState(false);

  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const isFinanceSecretary = user?.role === 'FINANCE_SECRETARY';

  const load = useCallback(async () => {
    try {
      const [summaryResult, invoicesResult] = await Promise.all([
        apiFetch<TreasurySummary>('/finance/summary'),
        apiFetch<Invoice[]>('/finance/invoices'),
      ]);
      setSummary(summaryResult);
      setInvoices(invoicesResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load finance data.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN' || user?.role === 'FINANCE_SECRETARY') void load();
  }, [user, load]);

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    setAllocError('');
    setAllocLoading(true);
    try {
      await apiFetch('/finance/allocate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: allocProjectId,
          amount: Number(allocAmount),
          note: allocNote.trim() || undefined,
        }),
      });
      setAllocAmount('');
      setAllocNote('');
      void load();
    } catch (err) {
      setAllocError(err instanceof ApiError ? err.message : 'Failed to allocate funds.');
    } finally {
      setAllocLoading(false);
    }
  }

  async function handleReview(invoiceId: string, action: 'approve' | 'reject') {
    setReviewingId(invoiceId);
    try {
      await apiFetch(`/finance/invoices/${invoiceId}/${action}`, { method: 'POST' });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${action} invoice.`);
    } finally {
      setReviewingId(null);
    }
  }

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'FINANCE_SECRETARY']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-semibold text-slate-900">Finance</h2>
          <p className="mt-1 text-sm text-slate-500">Estate treasury, project allocations, and invoices.</p>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

          {summary && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <SummaryCard label="Treasury balance" value={formatMoney(summary.treasuryBalance)} />
              <SummaryCard label="Total collected" value={formatMoney(summary.totalCollected)} />
              <SummaryCard label="Total allocated" value={formatMoney(summary.totalAllocated)} />
            </div>
          )}

          {summary && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Projects</h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">Allocated</th>
                      <th className="px-4 py-3 font-medium">Spent</th>
                      <th className="px-4 py-3 font-medium">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.projects.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                        <td className="px-4 py-3 text-slate-600">{formatMoney(p.allocated)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatMoney(p.spent)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatMoney(p.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isFinanceSecretary && summary && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Allocate Funds</h3>
              <form
                onSubmit={handleAllocate}
                className="mt-3 space-y-4 rounded-lg border border-slate-200 bg-white p-6"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700">Project</label>
                  <select
                    required
                    value={allocProjectId}
                    onChange={(e) => setAllocProjectId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      Select a project
                    </option>
                    {summary.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Amount (max {formatMoney(summary.treasuryBalance)})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={allocAmount}
                    onChange={(e) => setAllocAmount(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Note <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={allocNote}
                    onChange={(e) => setAllocNote(e.target.value)}
                    placeholder="e.g. First phase materials"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>

                {allocError && <p className="text-sm text-red-600">{allocError}</p>}

                <button
                  type="submit"
                  disabled={allocLoading}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {allocLoading ? 'Allocating…' : 'Allocate'}
                </button>
              </form>
            </div>
          )}

          {invoices && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Invoices</h3>
              {invoices.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No invoices raised yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Project</th>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Vendor</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Raised by</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        {isFinanceSecretary && <th className="px-4 py-3 font-medium"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{invoice.project.title}</td>
                          <td className="px-4 py-3 text-slate-600">{invoice.description}</td>
                          <td className="px-4 py-3 text-slate-600">{invoice.vendor ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatMoney(invoice.amount)}</td>
                          <td className="px-4 py-3 text-slate-600">{invoice.raisedBy.fullName}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={invoice.status} />
                          </td>
                          {isFinanceSecretary && (
                            <td className="px-4 py-3 text-right">
                              {invoice.status === 'PENDING' && (
                                <div className="flex justify-end gap-3">
                                  <button
                                    onClick={() => handleReview(invoice.id, 'approve')}
                                    disabled={reviewingId === invoice.id}
                                    className="text-xs font-medium text-green-700 hover:text-green-900 disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReview(invoice.id, 'reject')}
                                    disabled={reviewingId === invoice.id}
                                    className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const styles = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-700',
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

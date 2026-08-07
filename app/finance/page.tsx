'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { downloadCsv } from '@/lib/csv-export';
import { Invoice, Pledge, TreasurySummary } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';

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

  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [pledgesByProject, setPledgesByProject] = useState<Record<string, Pledge[]>>({});
  const [pledgesLoading, setPledgesLoading] = useState(false);
  const [pledgesError, setPledgesError] = useState('');
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

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

  function handleExportProjects() {
    if (!summary) return;
    downloadCsv(
      'projects-financial-report.csv',
      [
        { key: 'title', label: 'Project' },
        { key: 'allocated', label: 'Allocated (NGN)' },
        { key: 'spent', label: 'Spent (NGN)' },
        { key: 'remaining', label: 'Remaining (NGN)' },
        { key: 'donated', label: 'Donated (NGN)' },
        { key: 'pledged', label: 'Pledged (NGN)' },
      ],
      summary.projects.map((p) => ({
        title: p.title,
        allocated: p.allocated,
        spent: p.spent,
        remaining: p.remaining,
        donated: p.donated,
        pledged: p.pledged,
      })),
    );
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

  async function togglePledges(projectId: string) {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      return;
    }
    setExpandedProjectId(projectId);
    if (!pledgesByProject[projectId]) {
      setPledgesError('');
      setPledgesLoading(true);
      try {
        const result = await apiFetch<Pledge[]>(`/projects/${projectId}/pledges`);
        setPledgesByProject((prev) => ({ ...prev, [projectId]: result }));
      } catch (err) {
        setPledgesError(err instanceof ApiError ? err.message : 'Failed to load pledges.');
      } finally {
        setPledgesLoading(false);
      }
    }
  }

  async function handleRemind(projectId: string, pledgeId: string) {
    setRemindingId(pledgeId);
    try {
      await apiFetch(`/projects/${projectId}/pledges/${pledgeId}/remind`, { method: 'POST' });
      setRemindedIds((prev) => new Set(prev).add(pledgeId));
    } catch (err) {
      setPledgesError(err instanceof ApiError ? err.message : 'Failed to send reminder.');
    } finally {
      setRemindingId(null);
    }
  }

  async function handleFulfill(projectId: string, pledgeId: string) {
    setFulfillingId(pledgeId);
    try {
      await apiFetch(`/projects/${projectId}/pledges/${pledgeId}/fulfill`, { method: 'POST' });
      const refreshed = await apiFetch<Pledge[]>(`/projects/${projectId}/pledges`);
      setPledgesByProject((prev) => ({ ...prev, [projectId]: refreshed }));
      void load();
    } catch (err) {
      setPledgesError(err instanceof ApiError ? err.message : 'Failed to mark pledge as fulfilled.');
    } finally {
      setFulfillingId(null);
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
            <div className="mt-4 grid grid-cols-2 gap-4">
              <SummaryCard label="Total donated (projects)" value={formatMoney(summary.totalDonated)} />
              <SummaryCard label="Total pledged" value={formatMoney(summary.totalPledged)} />
            </div>
          )}

          {summary && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Projects</h3>
                <button
                  onClick={handleExportProjects}
                  disabled={summary.projects.length === 0}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
              {pledgesError && <p className="mt-2 text-xs text-red-600">{pledgesError}</p>}
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">Allocated</th>
                      <th className="px-4 py-3 font-medium">Spent</th>
                      <th className="px-4 py-3 font-medium">Remaining</th>
                      <th className="px-4 py-3 font-medium">Donated</th>
                      <th className="px-4 py-3 font-medium">Pledged</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.projects.map((p) => (
                      <Fragment key={p.id}>
                        <tr>
                          <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                          <td className="px-4 py-3 text-slate-600">{formatMoney(p.allocated)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatMoney(p.spent)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatMoney(p.remaining)}</td>
                          <td className="px-4 py-3 text-accent2-hover">{formatMoney(p.donated)}</td>
                          <td className="px-4 py-3 text-slate-500">{formatMoney(p.pledged)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => togglePledges(p.id)}
                              className="text-xs font-medium text-accent2 hover:text-accent2-hover"
                            >
                              {expandedProjectId === p.id ? 'Hide pledges' : 'Pledges breakdown'}
                            </button>
                          </td>
                        </tr>
                        {expandedProjectId === p.id && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50 px-4 py-3">
                              <PledgesBreakdown
                                loading={pledgesLoading && !pledgesByProject[p.id]}
                                pledges={pledgesByProject[p.id]}
                                remindingId={remindingId}
                                fulfillingId={fulfillingId}
                                remindedIds={remindedIds}
                                onRemind={(pledgeId) => handleRemind(p.id, pledgeId)}
                                onFulfill={(pledgeId) => handleFulfill(p.id, pledgeId)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
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
                        <th className="px-4 py-3 font-medium">Receipt</th>
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
                            {invoice.mediaBase64 ? (
                              <MediaPreview dataUrl={invoice.mediaBase64} className="h-10 w-10 rounded object-cover" />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
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

function PledgesBreakdown({
  loading,
  pledges,
  remindingId,
  fulfillingId,
  remindedIds,
  onRemind,
  onFulfill,
}: {
  loading: boolean;
  pledges: Pledge[] | undefined;
  remindingId: string | null;
  fulfillingId: string | null;
  remindedIds: Set<string>;
  onRemind: (pledgeId: string) => void;
  onFulfill: (pledgeId: string) => void;
}) {
  if (loading) return <p className="text-xs text-slate-500">Loading pledges…</p>;
  if (!pledges || pledges.length === 0) {
    return <p className="text-xs text-slate-500">No pledges made for this project yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {pledges.map((pl) => (
        <li key={pl.id} className="flex items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-medium text-slate-800">
              {pl.user.fullName}
              {pl.user.house && <span className="text-slate-400"> · {pl.user.house}</span>}
            </p>
            <p className="text-slate-500">
              Pledged {formatMoney(pl.amount)}
              {pl.remindedAt && !pl.fulfilledAt && ' · reminded'}
            </p>
          </div>
          {pl.fulfilledAt ? (
            <span className="shrink-0 rounded-full bg-accent2-soft px-2 py-1 font-medium text-accent2-hover">
              Fulfilled
            </span>
          ) : (
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => onRemind(pl.id)}
                disabled={remindingId === pl.id || fulfillingId === pl.id}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {remindingId === pl.id ? 'Sending…' : remindedIds.has(pl.id) || pl.remindedAt ? 'Remind again' : 'Remind'}
              </button>
              <button
                onClick={() => onFulfill(pl.id)}
                disabled={fulfillingId === pl.id || remindingId === pl.id}
                className="rounded-md bg-accent2 px-2 py-1 font-medium text-white hover:bg-accent2-hover disabled:opacity-50"
              >
                {fulfillingId === pl.id ? 'Saving…' : 'Mark fulfilled'}
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
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

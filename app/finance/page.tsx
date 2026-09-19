'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { downloadCsv } from '@/lib/csv-export';
import { Invoice, Pledge, TreasurySummary } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

type InvoiceStatusFilter = 'ALL' | Invoice['status'];

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

  const [remindersLoading, setRemindersLoading] = useState(false);
  const [remindersMsg, setRemindersMsg] = useState('');

  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [pledgesByProject, setPledgesByProject] = useState<Record<string, Pledge[]>>({});
  const [pledgesLoading, setPledgesLoading] = useState(false);
  const [pledgesError, setPledgesError] = useState('');
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const isFinanceSecretary = user?.role === 'FINANCE_SECRETARY';

  const [projectSearch, setProjectSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>('ALL');

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
    if (user?.role === 'ADMIN' || user?.role === 'FINANCE_SECRETARY' || user?.role === 'CHAIRMAN') void load();
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

  async function handleSendReminders() {
    setRemindersLoading(true);
    setRemindersMsg('');
    try {
      const result = await apiFetch<{ dues: number; levies: number; pledges: number }>(
        '/reminders/send-all',
        { method: 'POST' },
      );
      setRemindersMsg(
        `Reminders sent — ${result.dues} dues, ${result.levies} levies, ${result.pledges} pledges.`,
      );
    } catch (err) {
      setRemindersMsg(err instanceof ApiError ? err.message : 'Failed to send reminders.');
    } finally {
      setRemindersLoading(false);
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

  const filteredProjects = useMemo(() => {
    if (!summary) return [];
    const q = projectSearch.trim().toLowerCase();
    if (!q) return summary.projects;
    return summary.projects.filter((p) => p.title.toLowerCase().includes(q));
  }, [summary, projectSearch]);
  const projectsPage = usePaginatedList(filteredProjects);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    const q = invoiceSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (invoiceStatusFilter !== 'ALL' && inv.status !== invoiceStatusFilter) return false;
      if (!q) return true;
      return (
        inv.description.toLowerCase().includes(q) ||
        inv.project.title.toLowerCase().includes(q) ||
        (inv.vendor?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);
  const invoicesPage = usePaginatedList(filteredInvoices);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'FINANCE_SECRETARY', 'CHAIRMAN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-title">Finance</h2>
              <p className="mt-1 text-sm text-body">Estate treasury, project allocations, and invoices.</p>
            </div>
            {/* Read-only for the chairman: he can review the treasury but not message residents. */}
            {user.role !== 'CHAIRMAN' && (
              <button
                type="button"
                onClick={handleSendReminders}
                disabled={remindersLoading}
                className="rounded-lg bg-accent2 px-4 py-2 text-sm font-medium text-white hover:bg-accent2-hover disabled:opacity-50"
              >
                {remindersLoading ? 'Sending…' : 'Send payment reminders'}
              </button>
            )}
          </div>
          {remindersMsg && <p className="mt-2 text-sm text-accent-hover">{remindersMsg}</p>}

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}

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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-body">Projects</h3>
                <div className="flex items-center gap-2">
                  {summary.projects.length > 0 && (
                    <SearchInput value={projectSearch} onChange={setProjectSearch} placeholder="Search project…" />
                  )}
                  <button
                    onClick={handleExportProjects}
                    disabled={summary.projects.length === 0}
                    className="rounded-md border border-divider px-3 py-1.5 text-xs font-medium text-text hover:bg-accent-soft disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              {pledgesError && <p className="mt-2 text-xs text-danger">{pledgesError}</p>}
              {summary.projects.length > 0 && filteredProjects.length === 0 && (
                <p className="mt-3 text-sm text-body">No projects match your search.</p>
              )}
              {filteredProjects.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-divider bg-surface">
                <table className="min-w-full divide-y divide-divider text-sm">
                  <thead>
                    <tr className="text-left text-body">
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">Allocated</th>
                      <th className="px-4 py-3 font-medium">Spent</th>
                      <th className="px-4 py-3 font-medium">Remaining</th>
                      <th className="px-4 py-3 font-medium">Donated</th>
                      <th className="px-4 py-3 font-medium">Pledged</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {projectsPage.pageItems.map((p) => (
                      <Fragment key={p.id}>
                        <tr>
                          <td className="px-4 py-3 font-medium text-title">{p.title}</td>
                          <td className="px-4 py-3 text-body">{formatMoney(p.allocated)}</td>
                          <td className="px-4 py-3 text-body">{formatMoney(p.spent)}</td>
                          <td className="px-4 py-3 text-body">{formatMoney(p.remaining)}</td>
                          <td className="px-4 py-3 text-accent2-hover">{formatMoney(p.donated)}</td>
                          <td className="px-4 py-3 text-body">{formatMoney(p.pledged)}</td>
                          <td className="px-4 py-3 text-right">
                            {user.role !== 'CHAIRMAN' && (
                              <button
                                onClick={() => togglePledges(p.id)}
                                className="text-xs font-medium text-accent2 hover:text-accent2-hover"
                              >
                                {expandedProjectId === p.id ? 'Hide pledges' : 'Pledges breakdown'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedProjectId === p.id && (
                          <tr>
                            <td colSpan={7} className="bg-warm-50 px-4 py-3">
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
                <div className="border-t border-divider px-4 py-3">
                  <Pagination
                    page={projectsPage.page}
                    totalPages={projectsPage.totalPages}
                    onPageChange={projectsPage.setPage}
                    totalLabel={`${filteredProjects.length} project${filteredProjects.length === 1 ? '' : 's'}`}
                  />
                </div>
              </div>
              )}
            </div>
          )}

          {isFinanceSecretary && summary && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-body">Allocate Funds</h3>
              <form
                onSubmit={handleAllocate}
                className="mt-3 space-y-4 rounded-lg border border-divider bg-surface p-6"
              >
                <div>
                  <label className="block text-sm font-medium text-text">Project</label>
                  <select
                    required
                    value={allocProjectId}
                    onChange={(e) => setAllocProjectId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
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
                  <label className="block text-sm font-medium text-text">
                    Amount (max {formatMoney(summary.treasuryBalance)})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={allocAmount}
                    onChange={(e) => setAllocAmount(e.target.value)}
                    className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text">
                    Note <span className="text-body/70">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={allocNote}
                    onChange={(e) => setAllocNote(e.target.value)}
                    placeholder="e.g. First phase materials"
                    className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>

                {allocError && <p className="text-sm text-danger">{allocError}</p>}

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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-body">Invoices</h3>
                {invoices.length > 0 && (
                  <div className="flex gap-2">
                    <SearchInput
                      value={invoiceSearch}
                      onChange={setInvoiceSearch}
                      placeholder="Search project, description, vendor…"
                    />
                    <select
                      value={invoiceStatusFilter}
                      onChange={(e) => setInvoiceStatusFilter(e.target.value as InvoiceStatusFilter)}
                      className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                    >
                      <option value="ALL">All statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                )}
              </div>
              {invoices.length === 0 ? (
                <p className="mt-3 text-sm text-body">No invoices raised yet.</p>
              ) : filteredInvoices.length === 0 ? (
                <p className="mt-3 text-sm text-body">No invoices match your search/filter.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-divider bg-surface">
                  <table className="min-w-full divide-y divide-divider text-sm">
                    <thead>
                      <tr className="text-left text-body">
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
                    <tbody className="divide-y divide-divider">
                      {invoicesPage.pageItems.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-4 py-3 font-medium text-title">{invoice.project.title}</td>
                          <td className="px-4 py-3 text-body">{invoice.description}</td>
                          <td className="px-4 py-3 text-body">{invoice.vendor ?? '—'}</td>
                          <td className="px-4 py-3 text-body">{formatMoney(invoice.amount)}</td>
                          <td className="px-4 py-3 text-body">{invoice.raisedBy.fullName}</td>
                          <td className="px-4 py-3">
                            {invoice.mediaBase64 ? (
                              <MediaPreview dataUrl={invoice.mediaBase64} className="h-10 w-10 rounded object-cover" />
                            ) : (
                              <span className="text-body/70">—</span>
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
                                    className="text-xs font-medium text-danger hover:text-danger disabled:opacity-50"
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
                  <div className="border-t border-divider px-4 py-3">
                    <Pagination
                      page={invoicesPage.page}
                      totalPages={invoicesPage.totalPages}
                      onPageChange={invoicesPage.setPage}
                      totalLabel={`${filteredInvoices.length} invoice${filteredInvoices.length === 1 ? '' : 's'}`}
                    />
                  </div>
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
    <div className="rounded-lg border border-divider bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-body">{label}</p>
      <p className="mt-1 text-lg font-semibold text-title">{value}</p>
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
  const { page, setPage, totalPages, pageItems } = usePaginatedList(pledges ?? [], 5);

  if (loading) return <p className="text-xs text-body">Loading pledges…</p>;
  if (!pledges || pledges.length === 0) {
    return <p className="text-xs text-body">No pledges made for this project yet.</p>;
  }

  return (
    <>
    <ul className="space-y-2">
      {pageItems.map((pl) => (
        <li key={pl.id} className="flex items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-medium text-text">
              {pl.user.fullName}
              {pl.user.house && <span className="text-body/70"> · {pl.user.house}</span>}
            </p>
            <p className="text-body">
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
                className="rounded-md border border-divider bg-surface px-2 py-1 font-medium text-body hover:bg-accent-soft disabled:opacity-50"
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
    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalLabel={`${pledges.length} pledge${pledges.length === 1 ? '' : 's'}`} />
    </>
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

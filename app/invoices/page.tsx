'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Invoice, ProjectBreakdown } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';
import { readFileAsDataUrl } from '@/lib/read-file';

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export default function InvoicesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [projects, setProjects] = useState<ProjectBreakdown[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState('');

  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const [projectsResult, invoicesResult] = await Promise.all([
        apiFetch<ProjectBreakdown[]>('/finance/project-budgets'),
        apiFetch<Invoice[]>('/finance/invoices'),
      ]);
      setProjects(projectsResult);
      setInvoices(invoicesResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load invoices.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'PROJECT_ADMIN') void load();
  }, [user, load]);

  async function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceipt(await readFileAsDataUrl(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiFetch('/finance/invoices', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          amount: Number(amount),
          description,
          vendor: vendor.trim() || undefined,
          mediaBase64: receipt ?? undefined,
        }),
      });
      setAmount('');
      setDescription('');
      setVendor('');
      setReceipt(null);
      setSuccess(true);
      void load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to raise invoice.');
    } finally {
      setSubmitting(false);
    }
  }

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['PROJECT_ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-semibold text-slate-900">Invoices</h2>
          <p className="mt-1 text-sm text-slate-500">Raise invoices against a project&apos;s allocated budget.</p>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

          {projects && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Raise Invoice</h3>
              <form
                onSubmit={handleSubmit}
                className="mt-3 space-y-4 rounded-lg border border-slate-200 bg-white p-6"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700">Project</label>
                  <select
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      Select a project
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} — {formatMoney(p.remaining)} remaining
                      </option>
                    ))}
                  </select>
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
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Cement and gravel delivery"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Vendor <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g. Bricks & Co"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Receipt <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    className="mt-1 w-full text-sm text-slate-600"
                  />
                  {receipt && <MediaPreview dataUrl={receipt} className="mt-2 h-32 w-32 rounded-md object-cover" />}
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}
                {success && <p className="text-sm text-green-700">Invoice raised — awaiting review.</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Raise invoice'}
                </button>
              </form>
            </div>
          )}

          {invoices && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">All Invoices</h3>
              {invoices.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No invoices raised yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Project</th>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Receipt</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{invoice.project.title}</td>
                          <td className="px-4 py-3 text-slate-600">{invoice.description}</td>
                          <td className="px-4 py-3 text-slate-600">{formatMoney(invoice.amount)}</td>
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

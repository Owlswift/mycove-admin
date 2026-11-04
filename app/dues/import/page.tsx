'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { parseSpreadsheet } from '@/lib/sheet-parse';
import { downloadCsv } from '@/lib/csv-export';
import { formatMonthKey } from '@/lib/months';
import { DuesImportPreview, DuesImportRow, RESIDENT_TYPE_LABELS } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';

const MAX_ROWS = 2000;

interface UploadRow {
  phone: string;
  amount: string;
  period: string;
  name: string;
}

const HEADER_ALIASES: Record<keyof UploadRow, string[]> = {
  phone: ['phone', 'phone number', 'phonenumber', 'mobile', 'mobile number', 'tel'],
  amount: ['amount', 'amount paid', 'paid', 'amount (ngn)'],
  period: ['period', 'period covered', 'covers', 'months', 'paid for'],
  name: ['name', 'resident', 'full name', 'resident name'],
};

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

/** Turns the spreadsheet into rows, finding each column by its header so their order doesn't matter. */
function readUpload(table: string[][]): { rows: UploadRow[] } | { error: string } {
  if (table.length < 2) return { error: 'That file has no data rows. Use the template to see the layout.' };

  const headers = table[0].map((h) => h.trim().toLowerCase());
  const indexOf = (field: keyof UploadRow) => headers.findIndex((h) => HEADER_ALIASES[field].includes(h));
  const cols = { phone: indexOf('phone'), amount: indexOf('amount'), period: indexOf('period'), name: indexOf('name') };

  const missing = (['phone', 'amount'] as const).filter((f) => cols[f] === -1);
  if (missing.length > 0) {
    return { error: `The file is missing a "${missing.join('", "')}" column. Use the template to see the layout.` };
  }
  if (table.length - 1 > MAX_ROWS) {
    return { error: `That file has more than ${MAX_ROWS} rows — split it into smaller files.` };
  }

  return {
    rows: table.slice(1).map((r) => ({
      phone: (r[cols.phone] ?? '').trim(),
      amount: (r[cols.amount] ?? '').trim(),
      period: cols.period === -1 ? '' : (r[cols.period] ?? '').trim(),
      name: cols.name === -1 ? '' : (r[cols.name] ?? '').trim(),
    })),
  };
}

function periodLabel(row: DuesImportRow): string {
  if (!row.periodStart || !row.periodEnd) return 'Not given';
  const range =
    row.periodStart === row.periodEnd
      ? formatMonthKey(row.periodStart)
      : `${formatMonthKey(row.periodStart)} – ${formatMonthKey(row.periodEnd)}`;
  return `${range} (${row.months} mo)`;
}

function BalanceAfter({ row }: { row: DuesImportRow }) {
  if (row.balanceAfter === null) return <span className="text-body">—</span>;
  if (row.balanceAfter === 0) return <span className="text-green-700">Paid up</span>;
  return row.balanceAfter > 0 ? (
    <span className="font-medium text-red-700">{formatMoney(row.balanceAfter)} owed</span>
  ) : (
    <span className="font-medium text-amber-700">{formatMoney(-row.balanceAfter)} ahead</span>
  );
}

function Difference({ row }: { row: DuesImportRow }) {
  if (row.difference === null) return <span className="text-body">—</span>;
  if (row.difference === 0) return <span className="text-green-700">Paid in full</span>;
  return row.difference < 0 ? (
    <span className="font-medium text-red-700">{formatMoney(-row.difference)} short</span>
  ) : (
    <span className="font-medium text-amber-700">{formatMoney(row.difference)} ahead</span>
  );
}

const STATUS_STYLES = {
  OK: 'bg-green-100 text-green-800',
  DUPLICATE: 'bg-amber-100 text-amber-800',
  ERROR: 'bg-red-100 text-red-700',
} as const;
const STATUS_LABELS = { OK: 'Ready', DUPLICATE: 'Repeat', ERROR: 'Needs fixing' } as const;

export default function ImportDuesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [fileName, setFileName] = useState('');
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [preview, setPreview] = useState<DuesImportPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ imported: number; skipped: number; totalAmount: number } | null>(null);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [allowRepeats, setAllowRepeats] = useState(false);

  const visible = useMemo(
    () => (preview ? preview.results.filter((r) => !problemsOnly || r.status !== 'OK') : []),
    [preview, problemsOnly],
  );
  const { page, setPage, totalPages, pageItems } = usePaginatedList(visible);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  function downloadTemplate() {
    downloadCsv(
      'dues-import-template.csv',
      [
        { key: 'Phone', label: 'Phone' },
        { key: 'Name', label: 'Name' },
        { key: 'Amount', label: 'Amount' },
        { key: 'Period', label: 'Period' },
      ],
      [
        { Phone: '08035550142', Name: 'Example: total paid before the app', Amount: 1080000, Period: 'Jan 2024 - Dec 2025' },
        { Phone: '08025550199', Name: 'Example: period is optional', Amount: 405000, Period: '' },
      ],
    );
  }

  async function runPreview(rows: UploadRow[], repeats: boolean) {
    setChecking(true);
    setError('');
    try {
      setPreview(await apiFetch<DuesImportPreview>('/finance/dues-import/preview', {
        method: 'POST',
        body: JSON.stringify({ rows, allowRepeats: repeats }),
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to check the file.');
    } finally {
      setChecking(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setDone(null);
    setPreview(null);
    setProblemsOnly(false);
    setAllowRepeats(false);
    setFileName(file.name);

    let table: string[][];
    try {
      table = await parseSpreadsheet(file);
    } catch {
      setUploadRows([]);
      setError("Couldn't read that file. Make sure it's a CSV or Excel (.xlsx) file.");
      return;
    }
    const parsed = readUpload(table);
    if ('error' in parsed) {
      setUploadRows([]);
      setError(parsed.error);
      return;
    }
    setUploadRows(parsed.rows);

    await runPreview(parsed.rows, false);
  }

  async function handleImport() {
    setImporting(true);
    setError('');
    try {
      const result = await apiFetch<{ imported: number; skipped: number; totalAmount: number }>(
        '/finance/dues-import/commit',
        { method: 'POST', body: JSON.stringify({ rows: uploadRows, allowRepeats }) },
      );
      setDone(result);
      setPreview(null);
      setUploadRows([]);
      setFileName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to import the payments.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppShell user={user} allow={['FINANCE_SECRETARY']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/dues" className="inline-flex items-center gap-1 text-sm text-body hover:text-title">
            <ArrowLeft size={14} /> Back to Dues
          </Link>
          <h2 className="mt-3 text-xl font-semibold text-title">Import past payments</h2>
          <p className="mt-1 max-w-3xl text-sm text-body">
            Bring in what residents paid before the app. Each row says who paid and how much in total.
            Billing for each resident starts from the month and year on their profile as when they moved in. The app adds
            up each month&apos;s dues from then until today, at the rate that applied in each month, and subtracts
            everything paid to work out what&apos;s still owed.
          </p>

          <div className="mt-4 rounded-lg border border-divider bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-body">Your file needs these columns</p>
            <ul className="mt-2 space-y-1 text-sm text-text">
              <li>
                <b>Phone</b> — the resident&apos;s phone number, as registered in the app (matches them up).
              </li>
              <li>
                <b>Amount</b> — the total naira the resident paid before the app, e.g. 1080000.
              </li>
              <li>
                <b>Period</b> — optional. The months the payment covered, e.g. <code>Jan 2024 - Dec 2025</code>. It is
                kept with the payment and checked against what those months cost, but it does not change where billing
                starts.
              </li>
              <li>
                <b>Name</b> — optional, just to help you read the file.
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={downloadTemplate}
                className="rounded-md border border-divider px-3 py-1.5 text-sm font-medium text-text hover:bg-accent-soft"
              >
                Download template
              </button>
              <label
                htmlFor="dues-csv"
                className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Choose CSV or Excel file
              </label>
              <input
                id="dues-csv"
                type="file"
                accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFile}
                className="sr-only"
              />
              {fileName && <span className="text-sm text-body">{fileName}</span>}
            </div>
          </div>

          {error && <p className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
          {checking && <p className="mt-4 text-sm text-body">Checking every row…</p>}

          {done && (
            <div className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
              Imported {done.imported} payment{done.imported === 1 ? '' : 's'} totalling {formatMoney(done.totalAmount)}
              {done.skipped > 0 && ` (${done.skipped} row${done.skipped === 1 ? '' : 's'} skipped)`}. Balances on the{' '}
              <Link href="/dues" className="font-medium underline">
                Dues page
              </Link>{' '}
              are up to date.
            </div>
          )}

          {preview && (
            <>
              {preview.summary.noRates && (
                <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No dues rates are set yet, so the amount due for each period can&apos;t be shown. Set the rates on the
                  Dues page first if you want to check each row.
                </p>
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-divider bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-body">Ready to import</p>
                  <p className="mt-1 text-lg font-semibold text-green-800">{preview.summary.ok}</p>
                </div>
                <div className="rounded-lg border border-divider bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-body">Repeats held back</p>
                  <p className="mt-1 text-lg font-semibold text-amber-800">{preview.summary.duplicates}</p>
                </div>
                <div className="rounded-lg border border-divider bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-body">Need fixing</p>
                  <p className="mt-1 text-lg font-semibold text-red-700">{preview.summary.errors}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} />
                    Show only rows with a problem
                  </label>
                  {(preview.summary.duplicates > 0 || allowRepeats) && (
                    <label className="flex items-center gap-2 text-sm text-text">
                      <input
                        id="allow-repeats"
                        type="checkbox"
                        checked={allowRepeats}
                        onChange={(e) => {
                          setAllowRepeats(e.target.checked);
                          void runPreview(uploadRows, e.target.checked);
                        }}
                      />
                      Import repeats too (genuine second payments)
                    </label>
                  )}
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing || preview.summary.ok === 0}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {importing
                    ? 'Importing…'
                    : `Import ${preview.summary.ok} payment${preview.summary.ok === 1 ? '' : 's'}`}
                </button>
              </div>
              {preview.summary.errors > 0 && (
                <p className="mt-2 text-xs text-body">
                  Rows that need fixing are skipped. Correct them in your file and upload it again. A row with the same
                  resident and amount as an earlier import is held back so a repeated upload isn&apos;t counted twice.
                </p>
              )}

              <div className="mt-4 overflow-x-auto rounded-lg border border-divider bg-surface">
                <table className="min-w-full divide-y divide-divider text-sm">
                  <thead>
                    <tr className="text-left text-body">
                      <th className="px-4 py-3 font-medium">Row</th>
                      <th className="px-4 py-3 font-medium">Resident</th>
                      <th className="px-4 py-3 font-medium">Period</th>
                      <th className="px-4 py-3 font-medium">Paid</th>
                      <th className="px-4 py-3 font-medium">Billing from</th>
                      <th className="px-4 py-3 font-medium">Balance after import</th>
                      <th className="px-4 py-3 font-medium">Period check</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {pageItems.map((r) => (
                      <tr key={r.line}>
                        <td className="px-4 py-3 text-body">{r.line}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-title">{r.residentName ?? r.phone}</p>
                          <p className="text-xs text-body">
                            {[r.house, r.residentType && RESIDENT_TYPE_LABELS[r.residentType], r.phone]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-body">{periodLabel(r)}</td>
                        <td className="px-4 py-3 text-title">{r.amount === null ? '—' : formatMoney(r.amount)}</td>
                        <td className="px-4 py-3 text-body">{formatMonthKey(r.billingStart)}</td>
                        <td className="px-4 py-3">
                          <BalanceAfter row={r} />
                        </td>
                        <td className="px-4 py-3">
                          <Difference row={r} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                            {STATUS_LABELS[r.status]}
                          </span>
                          {r.message && <p className="mt-1 max-w-xs text-xs text-body">{r.message}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-divider px-4 py-3">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalLabel={`${visible.length} row${visible.length === 1 ? '' : 's'}`}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

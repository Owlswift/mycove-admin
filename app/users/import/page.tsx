'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { parseSpreadsheet } from '@/lib/sheet-parse';
import { downloadCsv } from '@/lib/csv-export';
import { ResidentImportPreview, ResidentImportRow, RESIDENT_TYPE_LABELS } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';

const MAX_ROWS = 2000;

interface UploadRow {
  phone: string;
  fullName: string;
  house: string;
  residentType: string;
  moveInMonth: string;
}

const HEADER_ALIASES: Record<keyof UploadRow, string[]> = {
  phone: ['phone', 'phone number', 'phonenumber', 'mobile', 'mobile number', 'tel'],
  fullName: ['full name', 'fullname', 'name', 'resident name'],
  house: ['house', 'house address', 'address'],
  residentType: ['resident type', 'residenttype', 'type'],
  moveInMonth: ['move-in month', 'move in month', 'moveinmonth', 'move-in', 'move in'],
};

/** Turns the spreadsheet into rows, finding each column by its header so their order doesn't matter. */
function readUpload(table: string[][]): { rows: UploadRow[] } | { error: string } {
  if (table.length < 2) return { error: 'That file has no data rows. Use the template to see the layout.' };

  const headers = table[0].map((h) => h.trim().toLowerCase());
  const indexOf = (field: keyof UploadRow) => headers.findIndex((h) => HEADER_ALIASES[field].includes(h));
  const cols = {
    phone: indexOf('phone'),
    fullName: indexOf('fullName'),
    house: indexOf('house'),
    residentType: indexOf('residentType'),
    moveInMonth: indexOf('moveInMonth'),
  };

  const missing = (['phone', 'fullName', 'residentType'] as const).filter((f) => cols[f] === -1);
  if (missing.length > 0) {
    return { error: `The file is missing a "${missing.join('", "')}" column. Use the template to see the layout.` };
  }
  if (table.length - 1 > MAX_ROWS) {
    return { error: `That file has more than ${MAX_ROWS} rows — split it into smaller files.` };
  }

  return {
    rows: table.slice(1).map((r) => ({
      phone: (r[cols.phone] ?? '').trim(),
      fullName: (r[cols.fullName] ?? '').trim(),
      house: cols.house === -1 ? '' : (r[cols.house] ?? '').trim(),
      residentType: (r[cols.residentType] ?? '').trim(),
      moveInMonth: cols.moveInMonth === -1 ? '' : (r[cols.moveInMonth] ?? '').trim(),
    })),
  };
}

const STATUS_STYLES = {
  OK: 'bg-green-100 text-green-800',
  DUPLICATE: 'bg-amber-100 text-amber-800',
  ERROR: 'bg-red-100 text-red-700',
} as const;
const STATUS_LABELS = { OK: 'Ready', DUPLICATE: 'Repeat', ERROR: 'Needs fixing' } as const;

export default function ImportResidentsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [fileName, setFileName] = useState('');
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [preview, setPreview] = useState<ResidentImportPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);
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
      'residents-import-template.csv',
      [
        { key: 'Phone', label: 'Phone' },
        { key: 'FullName', label: 'Full Name' },
        { key: 'House', label: 'House' },
        { key: 'ResidentType', label: 'Resident Type' },
        { key: 'MoveInMonth', label: 'Move-in Month' },
      ],
      [
        {
          Phone: '08035550142',
          FullName: 'Chidinma Okafor',
          House: '12 Palm Street',
          ResidentType: 'Regular',
          MoveInMonth: '2024-03',
        },
        {
          Phone: '08025550199',
          FullName: 'Tunde Adeyemi Stores',
          House: '4 Ocean Drive',
          ResidentType: 'Commercial',
          MoveInMonth: '',
        },
      ],
    );
  }

  async function runPreview(rows: UploadRow[], repeats: boolean) {
    setChecking(true);
    setError('');
    try {
      setPreview(
        await apiFetch<ResidentImportPreview>('/admin/residents-import/preview', {
          method: 'POST',
          body: JSON.stringify({ rows, allowRepeats: repeats }),
        }),
      );
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
      const result = await apiFetch<{ imported: number; skipped: number }>('/admin/residents-import/commit', {
        method: 'POST',
        body: JSON.stringify({ rows: uploadRows, allowRepeats }),
      });
      setDone(result);
      setPreview(null);
      setUploadRows([]);
      setFileName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to import the residents.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/users" className="inline-flex items-center gap-1 text-sm text-body hover:text-title">
            <ArrowLeft size={14} /> Back to Residents
          </Link>
          <h2 className="mt-3 text-xl font-semibold text-title">Bulk import residents</h2>
          <p className="mt-1 max-w-3xl text-sm text-body">
            Add many residents at once instead of one at a time. Each one gets a default password (their surname, in
            capitals) and is asked to set a new password the first time they sign in.
          </p>

          <div className="mt-4 rounded-lg border border-divider bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-body">Your file needs these columns</p>
            <ul className="mt-2 space-y-1 text-sm text-text">
              <li>
                <b>Phone</b> — the resident&apos;s phone number. Used to sign in and to tell residents apart.
              </li>
              <li>
                <b>Full Name</b> — used to show their name and to set their default password.
              </li>
              <li>
                <b>Resident Type</b> — <code>Regular</code> or <code>Commercial</code>.
              </li>
              <li>
                <b>House</b> — optional, their unit/address.
              </li>
              <li>
                <b>Move-in Month</b> — optional, e.g. <code>2024-03</code>. Dues billing starts from here if given,
                otherwise from today.
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
                htmlFor="residents-csv"
                className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Choose CSV or Excel file
              </label>
              <input
                id="residents-csv"
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
              Added {done.imported} resident{done.imported === 1 ? '' : 's'}
              {done.skipped > 0 && ` (${done.skipped} row${done.skipped === 1 ? '' : 's'} skipped)`}. They can sign
              in with their phone number and their surname (in capitals) as a one-time password.
            </div>
          )}

          {preview && (
            <>
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
                      Import repeats too (phone numbers already in the system)
                    </label>
                  )}
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing || preview.summary.ok === 0}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {importing ? 'Importing…' : `Import ${preview.summary.ok} resident${preview.summary.ok === 1 ? '' : 's'}`}
                </button>
              </div>
              {preview.summary.errors > 0 && (
                <p className="mt-2 text-xs text-body">
                  Rows that need fixing are skipped. Correct them in your file and upload it again.
                </p>
              )}

              <div className="mt-4 overflow-x-auto rounded-lg border border-divider bg-surface">
                <table className="min-w-full divide-y divide-divider text-sm">
                  <thead>
                    <tr className="text-left text-body">
                      <th className="px-4 py-3 font-medium">Row</th>
                      <th className="px-4 py-3 font-medium">Resident</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">House</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Move-in</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {pageItems.map((r: ResidentImportRow) => (
                      <tr key={r.line}>
                        <td className="px-4 py-3 text-body">{r.line}</td>
                        <td className="px-4 py-3 font-medium text-title">{r.fullName || '—'}</td>
                        <td className="px-4 py-3 text-body">{r.phone || '—'}</td>
                        <td className="px-4 py-3 text-body">{r.house ?? '—'}</td>
                        <td className="px-4 py-3 text-body">
                          {r.residentType ? RESIDENT_TYPE_LABELS[r.residentType] : '—'}
                        </td>
                        <td className="px-4 py-3 text-body">{r.moveInMonth ?? '—'}</td>
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

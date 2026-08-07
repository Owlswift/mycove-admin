/** Escapes a single CSV field — wraps in quotes and doubles any embedded quotes whenever the value contains a comma, quote, or newline. */
function csvField(value: string | number | boolean): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Builds a CSV from column headers + row objects and triggers a browser
 * download — no server round-trip, since every report here is exported
 * from data the page already has loaded.
 */
export function downloadCsv<T extends Record<string, string | number | boolean>>(
  filename: string,
  columns: { key: keyof T; label: string }[],
  rows: T[],
): void {
  const lines = [
    columns.map((c) => csvField(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => csvField(row[c.key])).join(',')),
  ];
  // Leading BOM so Excel opens the ₦ symbol and other non-ASCII text as UTF-8 instead of guessing wrong.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2024-01' → 'Jan 2024' */
export function formatMonthKey(key: string | null | undefined): string {
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return '—';
  return `${NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
}

/** The month after today, as 'YYYY-MM' — where a new rate normally starts. */
export function nextMonthKey(from: Date = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

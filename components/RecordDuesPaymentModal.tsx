'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import MediaPreview from '@/components/MediaPreview';
import { readFileAsDataUrl } from '@/lib/read-file';

interface Props {
  residentId: string;
  residentName: string;
  onClose: () => void;
  onRecorded: () => void;
}

export default function RecordDuesPaymentModal({ residentId, residentName, onClose, onRecorded }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceipt(await readFileAsDataUrl(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/finance/dues/${residentId}/record-payment`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          note: note.trim() || undefined,
          mediaBase64: receipt,
        }),
      });
      onRecorded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-title">Record payment — {residentName}</h2>
        <p className="mt-1 text-sm text-body">
          For dues paid outside the app — cash, bank transfer, or anything else sent directly to the
          estate&apos;s account. Attach the receipt as evidence; this adds a payment to their ledger
          immediately.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Amount</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Receipt</label>
            <input
              type="file"
              required
              accept="image/*"
              onChange={handleReceiptChange}
              className="mt-1 w-full text-sm text-body"
            />
            {receipt && <MediaPreview dataUrl={receipt} className="mt-2 h-32 w-32 rounded-md object-cover" />}
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Note <span className="text-body/70">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bank transfer, ref TX-9012"
              className="mt-1 w-full rounded-md border border-divider px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-body hover:bg-accent-soft"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import MediaPreview from '@/components/MediaPreview';
import { readFileAsDataUrl } from '@/lib/read-file';

interface Props {
  levyId: string;
  levyLabel: string;
  residentId: string;
  residentName: string;
  onClose: () => void;
  onRecorded: () => void;
}

export default function RecordLevyPaymentModal({
  levyId,
  levyLabel,
  residentId,
  residentName,
  onClose,
  onRecorded,
}: Props) {
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
      await apiFetch(`/finance/levies/${levyId}/residents/${residentId}/record-payment`, {
        method: 'POST',
        body: JSON.stringify({ mediaBase64: receipt }),
      });
      onRecorded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark as paid.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Mark paid — {residentName}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {levyLabel}, paid outside the app. Attach the receipt as evidence.
        </p>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700">Receipt</label>
          <input
            type="file"
            required
            accept="image/*"
            onChange={handleReceiptChange}
            className="mt-1 w-full text-sm text-slate-600"
          />
          {receipt && <MediaPreview dataUrl={receipt} className="mt-2 h-32 w-32 rounded-md object-cover" />}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Mark as paid'}
          </button>
        </div>
      </form>
    </div>
  );
}

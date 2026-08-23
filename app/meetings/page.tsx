'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Meeting } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

function formatDateForInput(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTimeForInput(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function MeetingsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingExtractionId, setEditingExtractionId] = useState<string | null>(null);
  const [extractionForm, setExtractionForm] = useState({ topics: '', decisions: '', actionItems: '' });
  const [form, setForm] = useState({
    title: '',
    date: formatDateForInput(new Date()),
    time: formatTimeForInput(new Date()),
    location: '',
    agenda: [''],
    report: '',
  });

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<Meeting[]>('/meetings/admin/all');
      setMeetings(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load meetings.');
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') void load();
  }, [user, load]);

  function startCreate() {
    setEditingId(null);
    setForm({ title: '', date: '', time: '', location: '', agenda: [''], report: '' });
    setShowEditor(true);
  }

  function startEdit(meeting: Meeting) {
    setEditingId(meeting.id);
    setForm({
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      location: meeting.location,
      agenda: meeting.agenda.length > 0 ? meeting.agenda : [''],
      report: meeting.report ?? '',
    });
    setShowEditor(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ title: '', date: '', time: '', location: '', agenda: [''], report: '' });
    setShowEditor(false);
  }

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateAgenda(index: number, value: string) {
    setForm((f) => {
      const agenda = [...f.agenda];
      agenda[index] = value;
      return { ...f, agenda };
    });
  }

  function addAgendaItem() {
    setForm((f) => ({ ...f, agenda: [...f.agenda, ''] }));
  }

  function removeAgendaItem(index: number) {
    setForm((f) => ({ ...f, agenda: f.agenda.filter((_, i) => i !== index) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusyId(editingId || 'new');
    try {
      const payload = {
        title: form.title.trim(),
        date: form.date.trim(),
        time: form.time.trim(),
        location: form.location.trim(),
        agenda: form.agenda.map((t) => t.trim()).filter((t) => t.length > 0),
        report: form.report.trim(),
      };
      if (editingId) {
        await apiFetch(`/meetings/admin/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/meetings/admin', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      cancelEdit();
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save meeting.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this meeting? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await apiFetch(`/meetings/admin/${id}`, { method: 'DELETE' });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete meeting.');
    } finally {
      setBusyId(null);
    }
  }

  function linesToList(text: string): string[] {
    return text
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  function startEditExtraction(meeting: Meeting) {
    setEditingExtractionId(meeting.id);
    setExtractionForm({
      topics: meeting.aiTopics.join('\n'),
      decisions: meeting.aiDecisions.join('\n'),
      actionItems: meeting.aiActionItems.join('\n'),
    });
  }

  function cancelEditExtraction() {
    setEditingExtractionId(null);
    setExtractionForm({ topics: '', decisions: '', actionItems: '' });
  }

  async function handleSaveExtraction(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/meetings/admin/${id}/extraction`, {
        method: 'PATCH',
        body: JSON.stringify({
          topics: linesToList(extractionForm.topics),
          decisions: linesToList(extractionForm.decisions),
          actionItems: linesToList(extractionForm.actionItems),
        }),
      });
      cancelEditExtraction();
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save the extraction.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/meetings/admin/${id}/approve`, { method: 'POST' });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReprocess(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/meetings/admin/${id}/reprocess`, { method: 'POST' });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reprocess.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!meetings) return [];
    const q = search.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter((m) => m.title.toLowerCase().includes(q) || m.location.toLowerCase().includes(q));
  }, [meetings, search]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Meetings</h2>
              <p className="mt-1 text-sm text-slate-500">Schedule and manage estate meetings.</p>
            </div>
            <div className="flex items-center gap-2">
              {meetings && meetings.length > 0 && !showEditor && (
                <SearchInput value={search} onChange={setSearch} placeholder="Search title or location…" />
              )}
              {!showEditor && (
                <button
                  onClick={startCreate}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  + New meeting
                </button>
              )}
            </div>
          </div>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

          {/* Editor */}
          {showEditor && (
            <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g. Annual General Meeting"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Time</label>
                  <input
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) => updateField('time', e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Location</label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="e.g. Community Hall"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Agenda (one per line)</label>
                <div className="mt-1 space-y-2">
                  {form.agenda.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <textarea
                        required
                        rows={2}
                        value={item}
                        onChange={(e) => updateAgenda(i, e.target.value)}
                        placeholder={`Agenda item ${i + 1}`}
                        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeAgendaItem(i)}
                        disabled={form.agenda.length <= 1}
                        className="mt-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addAgendaItem}
                  className="mt-2 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  + Add agenda item
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Meeting report</label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Written after the meeting happens. Residents can read this — or have the voice assistant read it
                  to them — word for word, so write it the way you want it heard.
                </p>
                <textarea
                  rows={8}
                  value={form.report}
                  onChange={(e) => updateField('report', e.target.value)}
                  placeholder="What was discussed, what was decided, and what happens next…"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={busyId !== null}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {busyId ? 'Saving…' : editingId ? 'Save changes' : 'Create meeting'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List */}
          {meetings === null && !error && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
          {meetings && meetings.length === 0 && !showEditor && (
            <p className="mt-6 text-sm text-slate-500">No meetings scheduled yet.</p>
          )}
          {meetings && meetings.length > 0 && filtered.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No meetings match your search.</p>
          )}
          {filtered.length > 0 && (
            <div className="mt-6 space-y-3">
              {pageItems.map((meeting) => (
                <div key={meeting.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{meeting.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {meeting.date} at {meeting.time} · {meeting.location}
                      </p>
                      {meeting.agenda.length > 0 && (
                        <ul className="mt-2 list-disc list-inside text-sm text-slate-600">
                          {meeting.agenda.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {meeting.report ? '✓ Report added' : 'No report added yet'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button
                        onClick={() => startEdit(meeting)}
                        disabled={busyId === meeting.id}
                        className="text-xs font-medium text-accent2 hover:text-accent2-hover disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(meeting.id)}
                        disabled={busyId === meeting.id}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {meeting.report && meeting.aiStatus === 'FAILED' && (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-700">
                        AI processing failed{meeting.aiError ? `: ${meeting.aiError}` : '.'}
                      </p>
                      <button
                        onClick={() => handleReprocess(meeting.id)}
                        disabled={busyId === meeting.id}
                        className="mt-1 text-xs font-medium text-accent2 hover:text-accent2-hover disabled:opacity-50"
                      >
                        Retry processing
                      </button>
                    </div>
                  )}

                  {meeting.report && meeting.aiStatus === 'PROCESSED' && editingExtractionId !== meeting.id && (
                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700">
                          Meeting Report — AI Processing Complete
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            meeting.approvedAt
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {meeting.approvedAt ? 'Approved ✓' : 'Awaiting approval'}
                        </span>
                      </div>

                      {meeting.aiDecisions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Decisions</p>
                          <ul className="mt-1 list-disc list-inside text-sm text-slate-700">
                            {meeting.aiDecisions.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {meeting.aiActionItems.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Action Items</p>
                          <ul className="mt-1 list-disc list-inside text-sm text-slate-700">
                            {meeting.aiActionItems.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {meeting.aiTopics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {meeting.aiTopics.map((t, i) => (
                            <span key={i} className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={() => startEditExtraction(meeting)}
                          disabled={busyId === meeting.id}
                          className="text-xs font-medium text-accent2 hover:text-accent2-hover disabled:opacity-50"
                        >
                          Edit
                        </button>
                        {!meeting.approvedAt && (
                          <button
                            onClick={() => handleApprove(meeting.id)}
                            disabled={busyId === meeting.id}
                            className="text-xs font-medium text-green-700 hover:text-green-900 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Residents and the voice assistant only see this once it&rsquo;s approved — until then
                        it&rsquo;s exactly as the AI produced it.
                      </p>
                    </div>
                  )}

                  {meeting.report && editingExtractionId === meeting.id && (
                    <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Decisions (one per line)</label>
                        <textarea
                          rows={3}
                          value={extractionForm.decisions}
                          onChange={(e) => setExtractionForm((f) => ({ ...f, decisions: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Action items (one per line)</label>
                        <textarea
                          rows={3}
                          value={extractionForm.actionItems}
                          onChange={(e) => setExtractionForm((f) => ({ ...f, actionItems: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Topics (one per line)</label>
                        <textarea
                          rows={2}
                          value={extractionForm.topics}
                          onChange={(e) => setExtractionForm((f) => ({ ...f, topics: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveExtraction(meeting.id)}
                          disabled={busyId === meeting.id}
                          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditExtraction}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                      {meeting.approvedAt && (
                        <p className="text-[11px] text-amber-600">
                          Saving will require re-approval, since it changes what was previously approved.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {filtered.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalLabel={`${filtered.length} meeting${filtered.length === 1 ? '' : 's'}`}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
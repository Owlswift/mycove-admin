'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Meeting } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

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
  const [form, setForm] = useState({ 
    title: '', 
    date: formatDateForInput(new Date()), 
    time: formatTimeForInput(new Date()), 
    location: '', 
    agenda: [''] 
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
    setForm({ title: '', date: '', time: '', location: '', agenda: [''] });
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
    });
    setShowEditor(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ title: '', date: '', time: '', location: '', agenda: [''] });
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

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Meetings</h2>
              <p className="mt-1 text-sm text-slate-500">Schedule and manage estate meetings.</p>
            </div>
            {!showEditor && (
              <button
                onClick={startCreate}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                + New meeting
              </button>
            )}
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
          {meetings && meetings.length > 0 && (
            <div className="mt-6 space-y-3">
              {meetings.map((meeting) => (
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
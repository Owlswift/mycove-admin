'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { RulesSection } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';

interface SectionForm {
  title: string;
  items: string[];
}

const EMPTY_FORM: SectionForm = { title: '', items: [''] };

export default function RulesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [sections, setSections] = useState<RulesSection[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<SectionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<RulesSection[]>('/rules/admin/all');
      setSections(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load rules.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN') void load();
  }, [user, load]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowEditor(true);
  }

  function startEdit(section: RulesSection) {
    setEditingId(section.id);
    setForm({
      title: section.title,
      items: section.items.map((i) => i.text),
    });
    setShowEditor(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowEditor(false);
  }

  function updateItem(index: number, value: string) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = value;
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, ''] }));
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        items: form.items
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
          .map((text, i) => ({ text, order: i })),
      };
      if (editingId) {
        await apiFetch(`/rules/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/rules', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      cancelEdit();
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save rules section.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this rules section? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await apiFetch(`/rules/${id}`, { method: 'DELETE' });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete rules section.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!sections) return [];
    const q = search.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.items.some((i) => i.text.toLowerCase().includes(q)),
    );
  }, [sections, search]);

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
              <h2 className="text-xl font-semibold text-slate-900">Rules & Regulations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the estate rules — formatting (bold, lists, headings) is preserved on the mobile app.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {sections && sections.length > 0 && !showEditor && (
                <SearchInput value={search} onChange={setSearch} placeholder="Search title or rule text…" />
              )}
              {!editingId && (
                <button
                  onClick={startCreate}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  + New section
                </button>
              )}
            </div>
          </div>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

          {/* Editor */}
          {showEditor ? (
            <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Section Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Security"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Rules (one per line — supports **bold**, *italic*, `code`, and - lists)
                </label>
                <div className="mt-1 space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <textarea
                        required
                        rows={2}
                        value={item}
                        onChange={(e) => updateItem(i, e.target.value)}
                        placeholder={`Rule ${i + 1} — e.g. **All visitors** must sign in at the gate.`}
                        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={form.items.length <= 1}
                        className="mt-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  + Add rule
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create section'}
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
          ) : null}

          {/* List */}
          {sections === null && !error && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
          {sections && sections.length === 0 && !editingId && (
            <p className="mt-6 text-sm text-slate-500">No rules sections yet. Create one to get started.</p>
          )}
          {sections && sections.length > 0 && filtered.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No sections match your search.</p>
          )}
          {filtered.length > 0 && (
            <div className="mt-6 space-y-3">
              {pageItems.map((section) => (
                <div key={section.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-900">{section.title}</p>
                    <div className="flex shrink-0 gap-3">
                      <button
                        onClick={() => startEdit(section)}
                        disabled={busyId === section.id}
                        className="text-xs font-medium text-accent2 hover:text-accent2-hover disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(section.id)}
                        disabled={busyId === section.id}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id} className="text-sm text-slate-600">
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {filtered.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalLabel={`${filtered.length} section${filtered.length === 1 ? '' : 's'}`}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
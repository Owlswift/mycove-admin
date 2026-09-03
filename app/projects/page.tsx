'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { Project } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';
import { readFileAsDataUrl } from '@/lib/read-file';

type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';

export default function ProjectsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<Project[]>('/projects');
      setProjects(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load projects.');
    }
  }, []);

  const canManage = user?.role === 'ADMIN';
  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROJECT_ADMIN';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN' || user?.role === 'PROJECT_ADMIN') void load();
  }, [user, load]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (status !== 'ALL' && p.status !== status) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q);
    });
  }, [projects, search, status]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'PROJECT_ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-title">Projects</h2>
              <p className="mt-1 text-sm text-body">Community projects, progress, and updates.</p>
            </div>
            <div className="flex items-center gap-2">
              {projects && projects.length > 0 && (
                <>
                  <SearchInput value={search} onChange={setSearch} placeholder="Search title…" />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                    className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="ALL">All</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </>
              )}
              {canCreate && (
                <Link
                  href="/projects/new"
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  + New project
                </Link>
              )}
            </div>
          </div>

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}
          {projects === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}
          {projects && projects.length === 0 && (
            <p className="mt-6 text-sm text-body">No projects created yet.</p>
          )}
          {projects && projects.length > 0 && filtered.length === 0 && (
            <p className="mt-6 text-sm text-body">No projects match your search/filter.</p>
          )}
          {filtered.length > 0 && (
            <div className="mt-6 space-y-3">
              {pageItems.map((p) => (
                <ProjectCard key={p.id} project={p} onChanged={load} authorName={user.fullName} canManage={canManage} />
              ))}
            </div>
          )}
          {filtered.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalLabel={`${filtered.length} project${filtered.length === 1 ? '' : 's'}`}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ProjectCard({
  project,
  onChanged,
  authorName,
  canManage,
}: {
  project: Project;
  onChanged: () => void;
  authorName: string;
  canManage: boolean;
}) {
  const [progress, setProgress] = useState(project.progress);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState('');

  const [showReportForm, setShowReportForm] = useState(false);
  const [author, setAuthor] = useState(authorName);
  const [text, setText] = useState('');
  const [reportMedia, setReportMedia] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  const [editDescription, setEditDescription] = useState(project.description);
  const [editGoal, setEditGoal] = useState(String(project.goal));
  const [editMedia, setEditMedia] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const reportsPage = usePaginatedList(project.reports, 5);

  async function handleUpdateProgress() {
    setProgressError('');
    setProgressLoading(true);
    try {
      await apiFetch(`/projects/${project.id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progress, status: progress === 100 ? 'COMPLETED' : 'IN_PROGRESS' }),
      });
      onChanged();
    } catch (err) {
      setProgressError(err instanceof ApiError ? err.message : 'Failed to update progress.');
    } finally {
      setProgressLoading(false);
    }
  }

  async function handleReportMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReportMedia(await readFileAsDataUrl(file));
  }

  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    setReportError('');
    setReportLoading(true);
    try {
      await apiFetch(`/projects/${project.id}/reports`, {
        method: 'POST',
        body: JSON.stringify({ author, text, mediaBase64: reportMedia ?? undefined }),
      });
      setText('');
      setReportMedia(null);
      setShowReportForm(false);
      onChanged();
    } catch (err) {
      setReportError(err instanceof ApiError ? err.message : 'Failed to add report.');
    } finally {
      setReportLoading(false);
    }
  }

  async function handleEditMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditMedia(await readFileAsDataUrl(file));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      await apiFetch(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          goal: Number(editGoal),
          budget: [{ label: 'General', amount: Number(editGoal) }],
          ...(editMedia ? { mediaBase64: editMedia } : {}),
        }),
      });
      setShowEditForm(false);
      onChanged();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update project.');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete project "${project.title}"? This cannot be undone.`)) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/projects/${project.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      setProgressError(err instanceof ApiError ? err.message : 'Failed to delete project.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-divider bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-title">{project.title}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            project.status === 'COMPLETED' ? 'bg-accent2-soft text-accent2-hover' : 'bg-accent-soft text-accent-hover'
          }`}
        >
          {project.status === 'COMPLETED' ? 'Completed' : 'In progress'}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-divider">
          <div className="h-full rounded-full bg-accent2" style={{ width: `${project.progress}%` }} />
        </div>
        <span className="w-10 shrink-0 text-right text-sm text-body">{project.progress}%</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-20 rounded-md border border-divider px-2 py-1 text-sm focus:border-accent focus:outline-none"
        />
        <button
          onClick={handleUpdateProgress}
          disabled={progressLoading || progress === project.progress}
          className="rounded-md border border-divider px-3 py-1 text-xs font-medium text-body hover:bg-accent-soft disabled:opacity-50"
        >
          {progressLoading ? 'Updating…' : 'Update progress'}
        </button>
        <button
          onClick={() => setShowReportForm((v) => !v)}
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          {showReportForm ? 'Cancel' : '+ Add report'}
        </button>
      </div>
      {progressError && <p className="mt-2 text-xs text-danger">{progressError}</p>}

      {showReportForm && (
        <form onSubmit={handleAddReport} className="mt-3 space-y-2 rounded-md bg-warm-50 p-3">
          <input
            type="text"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author, e.g. Finance Secretary"
            className="w-full rounded-md border border-divider px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <textarea
            required
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Update text…"
            className="w-full rounded-md border border-divider px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleReportMediaChange}
            className="w-full text-xs text-body"
          />
          {reportMedia && <MediaPreview dataUrl={reportMedia} className="h-24 w-full rounded-md object-cover" />}
          {reportError && <p className="text-xs text-danger">{reportError}</p>}
          <button
            type="submit"
            disabled={reportLoading}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {reportLoading ? 'Posting…' : 'Post report'}
          </button>
        </form>
      )}

      {canManage && (
      <div className="mt-3 flex items-center gap-3 border-t border-divider pt-3">
        <button
          onClick={() => setShowEditForm((v) => !v)}
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          {showEditForm ? 'Cancel edit' : 'Edit project'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteLoading}
          className="text-xs font-medium text-danger hover:text-danger disabled:opacity-50"
        >
          {deleteLoading ? 'Deleting…' : 'Delete project'}
        </button>
      </div>
      )}

      {canManage && showEditForm && (
        <form onSubmit={handleEdit} className="mt-3 space-y-2 rounded-md bg-warm-50 p-3">
          <input
            type="text"
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Project title"
            className="w-full rounded-md border border-divider px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <textarea
            required
            rows={2}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Project description"
            className="w-full rounded-md border border-divider px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <input
            type="number"
            required
            min={1}
            value={editGoal}
            onChange={(e) => setEditGoal(e.target.value)}
            placeholder="Donation goal (₦)"
            className="w-48 rounded-md border border-divider px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleEditMediaChange}
            className="w-full text-xs text-body"
          />
          {editMedia && <MediaPreview dataUrl={editMedia} className="h-24 w-full rounded-md object-cover" />}
          {editError && <p className="text-xs text-danger">{editError}</p>}
          <button
            type="submit"
            disabled={editLoading}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {editLoading ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      {project.reports.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-divider pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-body/70">Updates</p>
          {reportsPage.pageItems.map((r, i) => (
            <div key={i} className="rounded-md bg-warm-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text">{r.author}</p>
                <p className="text-xs text-body/70">{r.date}</p>
              </div>
              <p className="mt-1 text-sm text-body">{r.text}</p>
              {r.mediaBase64 && (
                <MediaPreview dataUrl={r.mediaBase64} className="mt-2 h-32 w-full rounded-md object-cover" />
              )}
            </div>
          ))}
          <Pagination
            page={reportsPage.page}
            totalPages={reportsPage.totalPages}
            onPageChange={reportsPage.setPage}
            totalLabel={`${project.reports.length} update${project.reports.length === 1 ? '' : 's'}`}
          />
        </div>
      )}
    </div>
  );
}

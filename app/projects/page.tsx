'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { Project } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';
import MediaPreview from '@/components/MediaPreview';
import { readFileAsDataUrl } from '@/lib/read-file';

export default function ProjectsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<Project[]>('/projects');
      setProjects(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load projects.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.role === 'ADMIN') void load();
  }, [user, load]);

  if (userLoading || !user) {
    return <main className="flex flex-1 items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
              <p className="mt-1 text-sm text-slate-500">Community projects, progress, and updates.</p>
            </div>
            <Link
              href="/projects/new"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              + New project
            </Link>
          </div>

          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
          {projects === null && !error && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
          {projects && projects.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No projects created yet.</p>
          )}
          {projects && projects.length > 0 && (
            <div className="mt-6 space-y-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onChanged={load} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ProjectCard({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const [progress, setProgress] = useState(project.progress);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState('');

  const [showReportForm, setShowReportForm] = useState(false);
  const [author, setAuthor] = useState('Estate Admin');
  const [text, setText] = useState('');
  const [reportMedia, setReportMedia] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

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

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-900">{project.title}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            project.status === 'COMPLETED' ? 'bg-accent2-soft text-accent2-hover' : 'bg-accent-soft text-accent-hover'
          }`}
        >
          {project.status === 'COMPLETED' ? 'Completed' : 'In progress'}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-accent2" style={{ width: `${project.progress}%` }} />
        </div>
        <span className="w-10 shrink-0 text-right text-sm text-slate-500">{project.progress}%</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          onClick={handleUpdateProgress}
          disabled={progressLoading || progress === project.progress}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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
      {progressError && <p className="mt-2 text-xs text-red-600">{progressError}</p>}

      {showReportForm && (
        <form onSubmit={handleAddReport} className="mt-3 space-y-2 rounded-md bg-slate-50 p-3">
          <input
            type="text"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author, e.g. Finance Secretary"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <textarea
            required
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Update text…"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleReportMediaChange}
            className="w-full text-xs text-slate-600"
          />
          {reportMedia && <MediaPreview dataUrl={reportMedia} className="h-24 w-full rounded-md object-cover" />}
          {reportError && <p className="text-xs text-red-600">{reportError}</p>}
          <button
            type="submit"
            disabled={reportLoading}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {reportLoading ? 'Posting…' : 'Post report'}
          </button>
        </form>
      )}

      {project.reports.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Updates</p>
          {project.reports.map((r, i) => (
            <div key={i} className="rounded-md bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">{r.author}</p>
                <p className="text-xs text-slate-400">{r.date}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">{r.text}</p>
              {r.mediaBase64 && (
                <MediaPreview dataUrl={r.mediaBase64} className="mt-2 h-32 w-full rounded-md object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

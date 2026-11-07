'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users as UsersIcon,
  MessageSquareWarning,
  Vote,
  Wallet,
  CalendarDays,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { AdminUser, Complaint, Poll, TreasurySummary, Meeting, Announcement } from '@/lib/types';
import { useCurrentUser } from '@/lib/use-current-user';
import AppShell from '@/components/AppShell';

function formatNaira(amount: number): string {
  return `₦${new Intl.NumberFormat('en-NG').format(amount)}`;
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  hint,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl border border-divider bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-title">{value}</p>
        <p className="text-sm text-body">{label}</p>
      </div>
      {hint && <p className="text-xs text-body">{hint}</p>}
    </Link>
  );
}

function AdminDashboard({ user }: { user: AdminUser }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);

  useEffect(() => {
    void apiFetch<AdminUser[]>('/admin/users').then(setUsers).catch(() => setUsers([]));
    void apiFetch<Complaint[]>('/complaints/admin/all').then(setComplaints).catch(() => setComplaints([]));
    void apiFetch<Poll[]>('/polls').then(setPolls).catch(() => setPolls([]));
    void apiFetch<TreasurySummary>('/finance/summary').then(setTreasury).catch(() => setTreasury(null));
    void apiFetch<Meeting[]>('/meetings/admin/all').then(setMeetings).catch(() => setMeetings([]));
    void apiFetch<Announcement[]>('/announcements').then(setAnnouncements).catch(() => setAnnouncements([]));
  }, []);

  const residents = users?.filter((u) => u.role === 'RESIDENT') ?? [];
  const pendingComplaints = complaints?.filter((c) => c.status !== 'RESOLVED').length ?? 0;
  const openPolls = polls?.filter((p) => p.closesIn !== 'Closed').length ?? 0;

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-semibold text-title">Estate Overview</h2>
        <p className="mt-1 text-sm text-body">
          Welcome back, {user.fullName.split(' ')[0]} — here&rsquo;s what needs attention at{' '}
          {user.estateName ?? 'your estate'}.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            href="/users"
            icon={UsersIcon}
            label="Residents"
            value={users === null ? '…' : String(residents.length)}
            hint={users ? `${users.filter((u) => u.mustResetPassword).length} awaiting first login` : undefined}
          />
          <StatCard
            href="/complaints"
            icon={MessageSquareWarning}
            label="Open complaints"
            value={complaints === null ? '…' : String(pendingComplaints)}
            hint={complaints ? `${complaints.length} total` : undefined}
          />
          <StatCard
            href="/polls"
            icon={Vote}
            label="Open polls"
            value={polls === null ? '…' : String(openPolls)}
            hint={polls ? `${polls.length} total` : undefined}
          />
          <StatCard
            href="/finance"
            icon={Wallet}
            label="Treasury balance"
            value={treasury === null ? '…' : formatNaira(treasury.treasuryBalance)}
            hint={treasury ? `${formatNaira(treasury.totalCollected)} collected to date` : undefined}
          />
          <StatCard
            href="/meetings"
            icon={CalendarDays}
            label="Meetings"
            value={meetings === null ? '…' : String(meetings.length)}
            hint="Scheduled or held"
          />
          <StatCard
            href="/announcements"
            icon={Megaphone}
            label="Announcements"
            value={announcements === null ? '…' : String(announcements.length)}
            hint={announcements?.[0]?.title}
          />
        </div>
      </div>
    </div>
  );
}

/** Finance Secretary / Project Admin see far fewer pages — a full stat grid
 * would mostly point at pages they can't open, so they get a lighter,
 * purely-navigational welcome instead. */
function LimitedDashboard({ user }: { user: AdminUser }) {
  const links =
    user.role === 'FINANCE_SECRETARY'
      ? [
          { href: '/finance', label: 'Finance overview' },
          { href: '/dues', label: 'Dues' },
          { href: '/levies', label: 'Levies' },
        ]
      : [{ href: '/invoices', label: 'Invoices' }, { href: '/projects', label: 'Projects' }];

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-semibold text-title">Welcome, {user.fullName.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-body">{user.estateName ?? 'Your estate'}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-divider bg-surface px-4 py-3 text-sm font-medium text-text shadow-sm hover:bg-accent-soft"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useCurrentUser();

  if (loading || !user) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  return (
    <AppShell user={user} allow={['ADMIN', 'FINANCE_SECRETARY', 'PROJECT_ADMIN', 'CHAIRMAN']}>
      {user.role === 'ADMIN' || user.role === 'CHAIRMAN' ? (
        <AdminDashboard user={user} />
      ) : (
        <LimitedDashboard user={user} />
      )}
    </AppShell>
  );
}

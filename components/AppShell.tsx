'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users as UsersIcon,
  UserPlus,
  ClipboardList,
  Megaphone,
  CalendarDays,
  BookOpen,
  MessageSquareWarning,
  Vote,
  Building2,
  Sparkles,
  Wallet,
  Receipt,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { clearTokens } from '@/lib/auth';
import { identifyAdmin, resetAdminIdentity, trackPageView } from '@/lib/analytics';
import { AdminUser, Role } from '@/lib/types';

type NavItem = { href: string; label: string; icon: LucideIcon; roles: Role[] };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'FINANCE_SECRETARY', 'PROJECT_ADMIN'] }],
  },
  {
    label: 'Residents & Access',
    items: [
      { href: '/users', label: 'Users', icon: UsersIcon, roles: ['ADMIN'] },
      { href: '/household-invites', label: 'Household Invites', icon: UserPlus, roles: ['ADMIN'] },
      { href: '/access-log', label: 'Access Log', icon: ClipboardList, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['ADMIN'] },
      { href: '/meetings', label: 'Meetings', icon: CalendarDays, roles: ['ADMIN'] },
      { href: '/rules', label: 'Rules', icon: BookOpen, roles: ['ADMIN'] },
      { href: '/complaints', label: 'Complaints', icon: MessageSquareWarning, roles: ['ADMIN'] },
      { href: '/polls', label: 'Polls', icon: Vote, roles: ['ADMIN'] },
      { href: '/projects', label: 'Projects', icon: Building2, roles: ['ADMIN', 'PROJECT_ADMIN'] },
      { href: '/spotlights', label: 'Spotlights', icon: Sparkles, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/finance', label: 'Finance', icon: Wallet, roles: ['ADMIN', 'FINANCE_SECRETARY'] },
      { href: '/dues', label: 'Dues', icon: Receipt, roles: ['ADMIN', 'FINANCE_SECRETARY'] },
      { href: '/levies', label: 'Levies', icon: CreditCard, roles: ['ADMIN', 'FINANCE_SECRETARY'] },
      { href: '/invoices', label: 'Invoices', icon: FileText, roles: ['PROJECT_ADMIN'] },
    ],
  },
  {
    label: 'Settings',
    items: [{ href: '/estate-settings', label: 'Estate Settings', icon: Settings, roles: ['ADMIN'] }],
  },
];

export const ROLE_LABELS: Record<Role, string> = {
  RESIDENT: 'Resident',
  GUARD: 'Security Guard',
  ADMIN: 'Admin',
  FINANCE_SECRETARY: 'Finance Secretary',
  PROJECT_ADMIN: 'Project Admin',
  CHAIRMAN: 'Chairman',
};

/** First page each role lands on — also where a role gets bounced if it hits a page it can't use. */
export function defaultRouteForRole(role: Role): string {
  if (role === 'FINANCE_SECRETARY') return '/finance';
  if (role === 'PROJECT_ADMIN') return '/invoices';
  return '/dashboard';
}

export default function AppShell({
  user,
  allow,
  children,
}: {
  user: AdminUser;
  allow?: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (allow && !allow.includes(user.role)) {
      router.replace(defaultRouteForRole(user.role));
    }
  }, [allow, user.role, router]);

  // Identify the admin once per shell mount and track every route change.
  useEffect(() => {
    identifyAdmin({ adminId: user.id, adminRole: user.role });
  }, [user.id, user.role]);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  // A route change is the natural "close the mobile drawer" moment.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  function handleLogout() {
    resetAdminIdentity();
    clearTokens();
    router.push('/login');
  }

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);
  const blocked = allow && !allow.includes(user.role);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image src="/mycove-logo.png" alt="" width={28} height={28} className="shrink-0" />
        <div>
          <h1 className="text-base font-semibold text-title">MyCove Admin</h1>
          <p className="text-xs text-body">{ROLE_LABELS[user.role]}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-body/70 uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-accent text-white'
                        : 'text-text hover:bg-accent-soft'
                    }`}
                  >
                    <Icon size={17} strokeWidth={2} className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-divider px-3 py-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-text">{user.fullName}</p>
          {user.estateName && <p className="truncate text-xs text-body">{user.estateName}</p>}
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-body hover:bg-accent-soft hover:text-text"
        >
          <LogOut size={17} strokeWidth={2} />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-divider bg-surface md:flex">
        {sidebarContent}
      </aside>

      {/* Content column — mobile top bar (mobile only) + main, stacked
          vertically. This must be a single flex-col sibling of <aside>,
          not two separate flex-1 siblings of the outer row: main used to
          sit next to the mobile header wrapper instead of below it,
          splitting the screen in half on small viewports. */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-divider bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/mycove-logo.png" alt="" width={24} height={24} />
            <span className="text-sm font-semibold text-title">MyCove Admin</span>
          </div>
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-text hover:bg-accent-soft"
          >
            <Menu size={22} />
          </button>
        </header>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNavOpen(false)} />
            <div className="relative flex w-72 flex-col bg-surface shadow-xl">
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
                className="absolute top-4 right-3 rounded-md p-1.5 text-body hover:bg-accent-soft"
              >
                <X size={20} />
              </button>
              {sidebarContent}
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-warm-50">{blocked ? null : children}</main>
      </div>
    </div>
  );
}

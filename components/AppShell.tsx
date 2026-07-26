'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth';
import { AdminUser, Role } from '@/lib/types';

const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: '/users', label: 'Users', roles: ['ADMIN'] },
  { href: '/access-log', label: 'Access Log', roles: ['ADMIN'] },
  { href: '/announcements/new', label: 'Announcements', roles: ['ADMIN'] },
  { href: '/polls/new', label: 'Polls', roles: ['ADMIN'] },
  { href: '/notifications/new', label: 'Notifications', roles: ['ADMIN'] },
  { href: '/finance', label: 'Finance', roles: ['ADMIN', 'FINANCE_SECRETARY'] },
  { href: '/invoices', label: 'Invoices', roles: ['PROJECT_ADMIN'] },
];

const ROLE_LABELS: Record<Role, string> = {
  RESIDENT: 'Resident',
  GUARD: 'Security Guard',
  ADMIN: 'Admin',
  FINANCE_SECRETARY: 'Finance Secretary',
  PROJECT_ADMIN: 'Project Admin',
};

/** First page each role lands on — also where a role gets bounced if it hits a page it can't use. */
export function defaultRouteForRole(role: Role): string {
  if (role === 'FINANCE_SECRETARY') return '/finance';
  if (role === 'PROJECT_ADMIN') return '/invoices';
  return '/users';
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

  useEffect(() => {
    if (allow && !allow.includes(user.role)) {
      router.replace(defaultRouteForRole(user.role));
    }
  }, [allow, user.role, router]);

  function handleLogout() {
    clearTokens();
    router.push('/login');
  }

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const blocked = allow && !allow.includes(user.role);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">CommunityHub Admin</h1>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]} · {user.fullName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
        <nav className="mx-auto mt-4 flex max-w-5xl gap-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 bg-slate-50">{blocked ? null : children}</main>
    </div>
  );
}

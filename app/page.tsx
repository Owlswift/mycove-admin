'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/use-current-user';
import { defaultRouteForRole } from '@/components/AppShell';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (user) router.replace(defaultRouteForRole(user.role));
  }, [user, router]);

  return (
    <main className="flex flex-1 items-center justify-center text-slate-500">
      {loading ? 'Loading…' : null}
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from './api';
import { getAccessToken } from './auth';
import { AdminUser } from './types';

/** Fetches /users/me once per page — this is how we know which role's nav/pages to show. */
export function useCurrentUser() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    apiFetch<AdminUser>('/users/me')
      .then((result) => {
        if (!cancelled) setUser(result);
      })
      .catch(() => {
        if (!cancelled) router.replace('/login');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, loading };
}

import mixpanel from 'mixpanel-browser';

/**
 * Mixpanel project token — a client-side identifier by design (safe to
 * embed; it identifies the *project*, not a secret). Override with
 * NEXT_PUBLIC_MIXPANEL_TOKEN to point at another project.
 */
const TOKEN =
  process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? '2a61ab19563d6f61331f2d469bf8d24a';

let initialized = false;

function ensureInit() {
  if (initialized || typeof window === 'undefined') return;
  try {
    mixpanel.init(TOKEN, { debug: false });
    initialized = true;
  } catch {
    // Analytics must never break the dashboard.
  }
}

export function identifyAdmin(userId: string, role: string) {
  ensureInit();
  try {
    mixpanel.identify(userId);
    mixpanel.people.set({ role, surface: 'admin' });
    mixpanel.register({ surface: 'admin', role });
  } catch {}
}

export function resetAdminIdentity() {
  if (!initialized) return;
  try {
    mixpanel.reset();
  } catch {}
}

export function trackAdmin(event: string, props: Record<string, unknown> = {}) {
  ensureInit();
  try {
    mixpanel.track(event, props);
  } catch {}
}

/** Route change inside the dashboard shell. */
export function trackPageView(page: string) {
  trackAdmin('admin_page_viewed', { page });
}
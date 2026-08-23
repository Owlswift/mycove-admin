import mixpanel from 'mixpanel-browser';

const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const isEnabled = Boolean(token) && typeof window !== 'undefined';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;
if (isEnabled) {
  try {
    client = mixpanel.init(token as string, {
      debug: process.env.NODE_ENV === 'development',
    });
  } catch {
    // Silently disable if init fails.
  }
}

/**
 * Global properties auto-attached to every admin event via Mixpanel
 * super-properties. Set by [identifyAdmin] on login/AppShell mount.
 */
const globalProps: Record<string, unknown> = {
  environment: process.env.NODE_ENV ?? 'production',
};

/**
 * Attaches admin identity + global properties after login or on AppShell
 * mount. Global props (admin_id, estate_id, admin_role) are registered as
 * super-properties so every subsequent track() call inherits them.
 */
export function identifyAdmin(props: {
  adminId: string;
  estateId?: string;
  adminRole: string;
}) {
  if (!client) return;
  try {
    client.identify(props.adminId);
    globalProps['admin_id'] = props.adminId;
    if (props.estateId != null) globalProps['estate_id'] = props.estateId;
    globalProps['admin_role'] = props.adminRole;
    client.register(props);
  } catch {
    // Best-effort.
  }
}

/** Clears identity on logout so the next admin isn't attributed to the
 * previous one's funnel. */
export function resetAdminIdentity() {
  if (!client) return;
  try {
    client.reset();
  } catch {
    // Best-effort.
  }
  globalProps['admin_id'] = undefined;
  globalProps['estate_id'] = undefined;
  globalProps['admin_role'] = undefined;
}

/**
 * Tracks an admin event. Global properties are auto-attached via
 * super-properties; [props] should contain only business-specific properties.
 */
export function trackAdmin(event: string, props: Record<string, unknown> = {}) {
  if (!client) return;
  try {
    client.track(event, props);
  } catch {
    // Best-effort — never throw into caller.
  }
}

/** Tracks a page view from the admin dashboard. */
export function trackPageView(page: string, previousPage?: string) {
  const props: Record<string, unknown> = { screen_name: page };
  if (previousPage != null) {
    props['previous_screen'] = previousPage;
  }
  trackAdmin('screen_viewed', props);
}
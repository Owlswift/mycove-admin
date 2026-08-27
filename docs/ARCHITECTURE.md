# MyCove Admin Dashboard — Architecture

> Next.js (App Router) · React 19 · Tailwind CSS 4
>
> Feature inventory: [FEATURES.md](FEATURES.md) · API:
> [`../../mycove-api/docs/ARCHITECTURE.md`](../../mycove-api/docs/ARCHITECTURE.md)
> · Mobile app:
> [`../../mycove/docs/ARCHITECTURE.md`](../../mycove/docs/ARCHITECTURE.md)

## 1. System context

A thin, server-rendered-shell + client-interactive dashboard that talks to the
same MyCove API as the mobile apps — it holds **no data of its own** and no
direct database access. Runs on port 3001 (3000 is the API).

```
Browser ──▶ Next.js (app/) ── fetch() ──▶ MyCove API ──▶ PostgreSQL / FCM /
             (static shell,                Mixpanel / VTpass
              client pages)
```

## 2. Structure

```
app/            # one folder per route; every page is a client component
components/     # AppShell (nav + role routing), CreateUserModal,
                # RecordDuesPaymentModal, RecordLevyPaymentModal,
                # MediaPreview, Pagination, SearchInput
lib/
├── api.ts      # single typed fetch wrapper: bearer injection, ApiError,
│               # single-flight 401 refresh + retry
├── auth.ts     # token persistence in localStorage (access + refresh keys)
├── analytics.ts# Mixpanel browser SDK wrapper (trackAdmin)
├── use-current-user.ts   # session hook feeding role-based landing
├── use-paginated-list.ts # shared table pagination state
├── csv-export.ts         # client-side CSV download
└── read-file.ts          # media upload helper for announcements/projects
```

## 3. Data flow & auth

- All reads/writes go through `apiFetch<T>(path, options)` in `lib/api.ts`:
  injects `Authorization: Bearer` from `localStorage`, raises `ApiError` with
  status codes, and on any 401 (non-auth path) performs a **single-flight**
  refresh (`POST /auth/refresh`) shared across concurrent failures, then replays
  the request once. Failed refresh clears tokens.
- Tokens live in `localStorage` under `admin_access_token` /
  `admin_refresh_token` (deliberate: internal staff tool).
- `use-current-user` hydrates the profile from `GET /users/me`-shaped data and
  drives role-based landing: ADMIN → full dashboard, FINANCE_SECRETARY →
  finance, PROJECT_ADMIN → projects (`defaultRouteForRole` in AppShell).
- Pages compose list + modal patterns: paginated tables via
  `use-paginated-list`, mutations via the shared modals, then re-fetch.

## 4. Styling & UX conventions

- Tailwind CSS 4 with a small custom accent palette (`accent`, `accent-soft`)
  layered over default slate tones.
- Geist Sans/Mono loaded through `next/font`.
- Every list page follows the same skeleton: header row (title + primary
  action), search input, paginated table, detail actions inline.

## 5. Third-party integrations

| Third party | Purpose | Where | Configuration |
|---|---|---|---|
| **MyCove API** | All data & actions | `lib/api.ts` | `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3000/api`) |
| **Mixpanel** | Admin-side event tracking | `lib/analytics.ts` | `NEXT_PUBLIC_MIXPANEL_TOKEN`; absent ⇒ disabled |
| **Vercel/Next.js runtime** | Hosting/dev server (`next dev -p 3001`) | — | standard |

No direct database, Firebase, or payment-provider access — everything is mediated
by the API, so credentials never reach the browser beyond the user's own JWT.

## 6. Recent changes

1. **Rebrand to MyCove** — metadata title/description, login heading, app-shell
   header ("MyCove Admin"); package renamed `mycove-admin`; README refreshed.
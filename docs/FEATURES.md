# MyCove Admin Dashboard — Feature Documentation

> Next.js (App Router) internal web dashboard, port **3001**. Formerly
> **MyCove Admin**.
>
> Sibling docs: [`../mycove/docs/FEATURES.md`](../../mycove/docs/FEATURES.md)
> · [`../mycove-api/docs/FEATURES.md`](../../mycove-api/docs/FEATURES.md)

Estate-staff tool for account administration and estate management. Talks to the
same NestJS API as the mobile app (`NEXT_PUBLIC_API_BASE_URL`, default
`http://localhost:3000/api`). There is no self-registration in the mobile app —
**every resident/guard account starts here**, created by an admin with a default
password (the user's surname in caps) shown exactly once; the account is forced
to reset it and complete its profile in the mobile app on first login.

## 1. Access & roles

- Sign-in via `POST /auth/login` with role `ADMIN`; session persisted client-side.
- Role-gated landing after login:
  - **ADMIN** → full dashboard (users, content, finance, operations)
  - **FINANCE_SECRETARY** → lands on Finance
  - **PROJECT_ADMIN** → lands on Projects

## 2. Pages

| Page | Capabilities |
|---|---|
| `/login` | Admin sign-in |
| `/users` | Residents / guards / admins tables with setup status (password reset pending?); create user (phone, full name, role, optional house); reset password back to default; revoke & restore accounts |
| `/estate-settings` | Configure estate security-desk and management-office emergency phones — these power the mobile SOS screen |
| `/household-invites` | Pending resident-initiated invites with their access codes; approve (instantly provisions the invitee's account) or reject; joined-members view |
| `/dues` | Resident dues ledger |
| `/levies` | Levy creation/management; record levy payments per resident |
| `/finance` | Financial summary, fund allocation to projects, project budgets, dues-rate configuration, record dues payment |
| `/invoices` | Invoice review with approve/reject workflow |
| `/complaints` | All resident complaints with status workflow |
| `/announcements` (+`new`) | Publish announcements with image/video media |
| `/meetings` | Schedule and manage meetings and their reports |
| `/projects` (+`new`) | Community projects, progress posts, reports, pledge reminders/fulfilment |
| `/polls` (+`new`) | Create polls and view results |
| `/rules` | Community rules CRUD |
| `/spotlights` (+`new`) | Dashboard spotlight banners with visibility toggle |
| `/access-log` | Gate access history with CSV export |

## 3. Shared building blocks

- **`CreateUserModal`** — the account-provisioning form (phone, full name, role,
  optional house address); generates and displays the one-time default password.
- **`RecordDuesPaymentModal`** / **`RecordLevyPaymentModal`** — offline payment
  recording against a resident's dues/levies.
- **`MediaPreview`** — image/video attachment preview for announcements,
  meetings, projects, receipts.
- **`Pagination`** / **`SearchInput`** — consistent list navigation across tables.
- **CSV export** (`lib/csv-export.ts`) — export tabular data (e.g. access log).
- **Mixpanel analytics** (`lib/analytics.ts`) — admin-side event tracking.
- **Auth helpers** (`lib/auth.ts`, `lib/use-current-user.ts`) — session
  persistence and role-based routing; **`lib/api.ts`** — typed API client.

## 4. Recent changes

1. **Rebrand to MyCove** — metadata title/description, login heading, app-shell
   header now "MyCove Admin"; package renamed `mycove-admin`
   (package.json + lockfile); README updated (physical folder references kept,
   since the repos themselves aren't renamed).
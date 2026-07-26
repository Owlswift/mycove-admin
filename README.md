# CommunityHub Admin

A small internal web dashboard for estate staff to register residents and
security guards on [CommunityHub](../communityhub) — there is no
self-registration in the mobile app, so an admin account has to create
every resident/guard account here first.

## What it does

- Sign in as an admin (same `/auth/login` endpoint as the mobile app, `role: "ADMIN"`)
- List all residents, guards, and admins with their setup status
- Create a new resident or guard with just a phone number, full name, role,
  and (optional) house address — a default password (their surname in caps)
  is generated and shown once
- Reset a user's password back to that default if they get locked out

The created account is forced to change its password on first login and
complete the rest of its profile (email, emergency contact, vehicle plates,
confirm house address) from the mobile app itself — see
`communityhub`'s force-reset flow.

## Running it

Needs the `communityhub-api` backend running (`docker compose up -d` +
`npm run start:dev` there, Postgres seeded via `npm run prisma:seed`).

```bash
npm install
npm run dev
```

Runs on **http://localhost:3001** (not 3000 — that's the API). Set
`NEXT_PUBLIC_API_BASE_URL` in `.env.local` if the API isn't on
`http://localhost:3000/api` (see `.env.example`).

Demo admin login: `08000000001` / `admin123`.

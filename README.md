# MyCove Admin

Web dashboard for estate staff to run a residential estate on MyCove: register residents and guards, manage dues and levies, publish announcements and polls, and review the visitor access log. Built with Next.js, React, TypeScript and Tailwind CSS. There is no self-registration in the mobile app, so an admin account has to create every resident and guard account here first.

**Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Mixpanel, Docker. It talks to the MyCove API (NestJS, Prisma, PostgreSQL).

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
`mycove`'s force-reset flow.

## Running it

Needs the `mycove-api` backend running (`docker compose up -d` +
`npm run start:dev` there, Postgres seeded via `npm run prisma:seed`).

```bash
npm install
npm run dev
```

Runs on **http://localhost:3001** (not 3000 — that's the API). Set
`NEXT_PUBLIC_API_BASE_URL` in `.env.local` if the API isn't on
`http://localhost:3000/api` (see `.env.example`).

The admin account is created by the seed script in the MyCove API.

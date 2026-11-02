# CodxPy Helpdesk

A white, gray and green software support workspace for CodxPy, built in the existing Next.js App Router project. The root page sends signed-out visitors to sign in; signed-in users see persistent MongoDB data for their account role.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. No credentials are needed for the preview.

## Current implementation

The interface includes role-specific User/Agent/Admin workspaces, login and registration flows, profiles, internal-note presentation, SLA timers, skeletons and retry states. Dashboard and profile routes require a valid signed-in role; unauthenticated users cannot open sample dashboards.

Part 2 connects Auth.js Credentials sessions and role-specific dashboard/profile screens to MongoDB, with bcrypt password storage, User-only public registration, Mongoose models, validated APIs, ownership/assignment scopes, internal-note filtering, ticket creation/replies/status updates, Admin assignment, user promotion, category management, dashboard totals, and recent activity. Protected API requests re-check account activation and role against MongoDB.

## What works now

- Responsive sidebar and dashboard, preview metrics and illustrative Recharts analytics.
- Ticket title/number/customer search, status and priority filters.
- Preview ticket creation with required fields and length limits.
- Ticket details, replies and status changes within the current session.
- CSV export of the filtered queue, team/category views and activity summary.
- Native accessible dialogs, keyboard focus styles and mobile navigation.

Signed-in ticket changes use the configured MongoDB database. CodxPy support categories cover bug reports, feature requests, technical support, and account access. Tickets support up to three private PNG, JPG, or PDF attachments (5 MB each); attachment downloads are proxied through a server route that checks the signed-in user's access to the ticket. Ticket create, assignment, public reply, and resolution events send HTML email notifications over SMTP; delivery errors do not undo ticket changes. A secured SLA cron endpoint sends an agent reminder once near first-response and resolution deadlines, then auto-closes tickets 7 days after resolution if no later customer reply reopens them. Sample weekly chart data is illustrative; dashboard totals and activity use database records. Deployment and isolated-database permission verification remain pending.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm run build
```

## Next steps and manual setup

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the three-part implementation plan and manual setup checklist. `.env.example` contains integration placeholders; copy it to `.env.local` and add an Atlas connection URI, a random Auth.js secret, one-time initial Admin values, Gmail SMTP app-password settings, Cloudinary API credentials, and a unique `CRON_SECRET` (at least 16 random characters). Run `npm run db:init` to create the first Admin only when none exists and safely seed four categories and four default SLA rules. Never commit real secrets. Run `npm run integrations:check` to verify Cloudinary authenticated upload/download and SMTP connectivity without sending an email; this check cleans up its temporary Cloudinary asset. `vercel.json` schedules the SLA endpoint once per day at 09:00 UTC; configure the same `CRON_SECRET` in the deployment environment before scheduled runs.

## Structure

- `src/app`: page entry, metadata and global design system.
- `src/components/helpdesk.tsx`: role-specific workspace and preview/live UI.
- `src/lib/preview-data.ts`: session-only interface fixtures.
- `src/models`: database models and indexes.
- `src/app/api`: Auth.js endpoints and protected ticket/profile APIs.
- `public/codxpy.svg`: CodxPy software brand icon.

Stack currently installed: Next.js, React, TypeScript, Tailwind CSS, Lucide React and Recharts. Backend dependencies include Mongoose, Auth.js, bcryptjs, Zod, Cloudinary and Nodemailer. Read the locally installed Next.js documentation before extending this version.

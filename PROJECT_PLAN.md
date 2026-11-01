# CodxPy Helpdesk — three-part implementation plan

The existing Next.js 16.4.3 / React 19.3 project is the foundation. The user's latest direction takes precedence over the original blue palette: white, gray, and green, with no black UI colors.

Product branding now uses the company name CodxPy. Default support categories are Bug Report, Feature Request, Technical Support, and Account & Access; the previous starter categories are retired while historical tickets keep their category references.

## Part 1 — Interface and experience (complete)

Implemented: responsive admin workspace shell, overview cards, illustrative Recharts analytics, searchable ticket queue, priority/status filters, CSV export, ticket creation dialog, ticket conversation/reply/status preview, team and category views, activity summary, setup guide, mobile navigation, native modal keyboard behavior and empty results.

All records are explicitly UI fixtures, isolated in `src/lib/preview-data.ts`. Preview mutations live in React state and reset on refresh. The weekly chart is illustrative and is labeled separately from counters computed from the preview queue. These are not production ticket operations. Team availability and category defaults are also illustrative.

Complete: User/Agent/Admin views, login/register/profile screens, assignment and internal-note flows, attachment selection, countdown views, and skeleton/error/retry states. All dashboard and profile routes require sign-in; users are sent to the workspace matching their stored role. The weekly chart is illustrative.

## Part 2 — Secure backend and real data (implementation started)

Implemented: cached Mongoose connection; User, Category, Ticket, Message, ActivityLog, Counter and SLA rule models/indexes; Zod schemas; bcrypt/Auth.js Credentials/JWT sessions; User-only registration; profile API; protected paginated ticket APIs; server-side owner/assignment scope checks; internal-note filtering; admin-only assignment; SLA deadline calculations; dashboard aggregation; and `npm run db:init` for a guarded first Admin plus repeatable category/SLA-rule setup.
2. `src/models`: User, Category, Ticket, Message, ActivityLog, atomic ticket Counter.
3. `src/lib/auth`: Auth.js, bcryptjs credentials, session handling, account activation checks and fixed User registration role.
4. `src/lib/authorization`: reusable role and resource checks; enforce ownership and agent assignment in every sensitive API operation.
5. `src/lib/validation`: Zod schemas and consistent, non-sensitive API errors.
6. `src/services/tickets`: ticket operations, authorized replies, internal note visibility, assignment and immutable activity logs.
7. `src/app/api`: thin route handlers; database search, pagination, sort and dashboard aggregation.
8. Replace UI fixtures with authorized API results and build role-specific routes.

Connected: dashboard/profile reads and name updates; ticket listing/creation, replies, status changes and admin assignments; category and active-agent directories; dashboard totals and recent ticket activity. The signed-in dashboard enforces the account role in the route and server APIs.

Remaining in Part 2: isolated-database verification of authorization boundaries and broader pagination/search controls. Admins can promote registered User accounts to Agent and manage ticket categories; account registration remains open to User role only.

## Part 3 — Integrations, verification and delivery (integration work complete; release work remains)

1. Server-owned SLA deadlines and response/resolution timestamps; configurable rules.
2. Secured idempotent auto-close job that respects later user replies; verify hosting schedule limits before deployment.
3. Complete: Nodemailer HTML notifications for ticket creation, assignment, public reply and resolution; missing SMTP and send failures are graceful.
4. Complete: authorized Cloudinary authenticated uploads/downloads, up to 3 files per ticket, 5 MB per file, PNG/JPG/PDF validation, private metadata, and per-request ticket access checks.
5. Safely repeatable development seed: 1 admin, 2 agents, 3 users, 4 categories, 15+ tickets, conversations and audit entries.
6. Remaining: automated direct-API tests for IDOR, assigned-agent boundaries, internal note visibility, authentication, validation and concurrent ticket numbering.
7. Remaining: CASE_STUDY, screenshots, deployment settings and isolated-database authorization verification.

Acceptance: tests/build pass and integrations are verified with actual accounts. No production-ready or deployed claim until verified.

## Aapko manually kya karna hai

UI preview chalane ke liye kisi external account ki zaroorat nahi:

```sh
npm install
npm run dev
```

Backend phase se pehle:

- [x] MongoDB Atlas connection configured and verified; `helpdesk_db` initialized with the first Admin, CodxPy software support categories and four SLA rules. `.env.local` remains Git-ignored.
- [x] Current Atlas count check: 1 Admin account, 4 categories and 4 SLA rules; 0 tickets, messages and activity records. No legacy/sample tickets were migrated.
- [x] Cloudinary cloud name/API key/API secret `.env.local` mein set; authenticated upload/download and cleanup provider check passed.
- [x] Gmail SMTP settings `.env.local` mein set; SMTP connection and authentication check passed. Koi test email send nahi hui.
- [x] `AUTH_SECRET` generated locally. Admin bootstrap values are stored in `.env.local` and are never printed.
- [ ] `CRON_SECRET` ke liye alag random value generate karein before enabling scheduled jobs.
- [ ] Passwords aur secrets chat, screenshots ya Git mein share na karein. `.env.local` Git ignore mein hai.
- [ ] Launch phase mein apne GitHub/Vercel accounts connect karein aur environment variables Vercel project settings mein add karein.
- [ ] App ke through real email delivery check karne ke liye ek ticket create/reply/assign/resolve karein; SMTP verify sirf login/connectivity check karta hai, sender acceptance aur inbox delivery nahi.
- [ ] Attachment flow aur all three roles isolated database par verify karein; assignment ke liye actual screenshots capture karein.

`npm run integrations:check` checks Cloudinary authenticated asset upload/download/cleanup and SMTP authentication without sending a message. SMTP delivery and ticket-level authorization still need an end-to-end app run.

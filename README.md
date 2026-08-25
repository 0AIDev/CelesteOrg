# Celeste HQ

**Internal operating system for a 10-person AI startup.** An ElevenLabs-style, enterprise-grade web app built on Next.js 14 + Supabase that unifies people, documents, time-off, ideas, daily reports, equity, and approvals in one clean interface.

> **Design goal:** replicate the ElevenLabs dashboard's visual language — a neutral gray palette, cold-white surfaces, hairline borders, soft shadows, generous spacing, squircle avatars, pill quick-actions, underlined section tabs, and card grids with subtle hover lift.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS + design tokens in CSS custom properties |
| Backend / Auth | Supabase (Postgres, RLS, Storage, Auth, Realtime-ready) |
| UI primitives | Radix UI (Dialog, Dropdown, Popover, Tabs, Checkbox, Label) |
| Calendar | `@fullcalendar/react` (Month / Week / Day) |
| Animation | Framer Motion (page/slide-over transitions, hover lift) |
| Icons | Lucide React |
| Validation | Zod (every server action) |
| Squircle shapes | True superellipse SVG mask (`components/squircle-mask.css`) |

> **Note on `squircle-js`:** the requested package is **not published on npm** (verified — `npm i squircle-js` returns 404). The exact superellipse look is instead achieved with a reusable SVG mask (`.squircle`, `.squircle-avatar`), which is more robust (no dependency, works in every modern browser) and visually identical.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Apply the database schema in Supabase
#    - Create a project
#    - Enable: Storage, Auth (with email/password), RLS
#    - Run: supabase/migrations/0001_init.sql in the SQL editor

# 3. Configure environment
cp .env.example .env.local   # fill in URL + anon key

# 4. Run
npm run dev                  # http://localhost:3000 (Turbopack: ~1s cold start, instant HMR)
```

> **Dev server runs Turbopack** (`next dev --turbo`): much faster cold start and hot
> reload, and it sidesteps the webpack pack-file corruption race that used to
> produce chunk 404s on Windows.

## Performance & caching

- **Build/dev isolation** — the output dir is derived from `NODE_ENV` in
  `next.config.mjs` (dev → `.next-dev`, build → `.next`). Running `npm run build`
  while the dev server is up can no longer corrupt it (the old "Cannot find
  module './NNN.js'" loop).
- **Fresh HTML, immutable assets** — `middleware.ts` sets
  `Cache-Control: no-store` on HTML documents (every navigation picks up the
  latest chunk hashes, killing the stale `?v=` 404 loop), while hashed static
  assets keep `public, max-age=31536000, immutable` in production.
- **Lazy calendar** — FullCalendar (~200 kB) loads client-only via
  `components/calendar/CalendarLazy.tsx` with a skeleton fallback: `/calendar`
  first load dropped from 216 kB → 89 kB.
```

> Without `SUPABASE_SERVICE_ROLE_KEY` set, server-only admin features (document upload signed-URLs, signature audit writes, approval resolution) throw on first use. Set it in `.env.local` and keep it server-only.
>
> To mark a user as an **admin**, set their auth `app_metadata.role = "admin"` in the Supabase dashboard (the SQL `is_admin()` helper checks this claim).

---

## Project structure

```
.
├── supabase/migrations/0001_init.sql   # Full schema + RLS + helpers (single file)
├── middleware.ts                       # Session refresh + route protection
├── lib/
│   ├── supabase/  client.ts            # browser client
│   │               server.ts           # server client (cookies)
│   │               admin.ts            # service-role client (SERVER ONLY)
│   ├── auth.ts                         # getUser / getProfile (cached)
│   ├── types.ts                        # mirror of the DB schema
│   └── utils.ts                        # cn(), formatters (bytes/dates/initials)
├── app/
│   ├── layout.tsx                      # root layout, Inter font, dark-mode script
│   ├── page.tsx                        # redirect → /sign-in or /dashboard
│   ├── (auth)/sign-in/page.tsx         # login: "Enter HQ"
│   ├── (main)/layout.tsx               # server layout: fetch profile + LayoutProvider
│   ├── (main)/dashboard/page.tsx       # home: stats, today, approvals, quick actions
│   ├── (main)/org-chart/page.tsx       # org tree → slide-over profile
│   ├── (main)/teams/page.tsx           # department card grid + members
│   ├── (main)/documents/page.tsx       # list/grid, upload, preview
│   ├── (main)/calendar/page.tsx        # FullCalendar + create event
│   ├── (main)/ideas/page.tsx           # idea card grid, AI auto-categorize
│   ├── (main)/reports/page.tsx         # morning standup + EOD feed
│   ├── (main)/settings/page.tsx        # profile, security, notifications, equity
│   ├── (main)/developers/page.tsx      # API keys + integrations
│   └── actions/                        # all server actions (Zod-validated)
│       ├── auth-actions.ts
│       ├── document-actions.ts
│       ├── signature-actions.ts
│       ├── approval-actions.ts
│       ├── report-actions.ts
│       ├── calendar-actions.ts
│       ├── idea-actions.ts
│       └── settings-actions.ts
├── components/
│   ├── layout/      Sidebar.tsx  Header.tsx  LayoutProvider.tsx
│   ├── nav/         config.ts
│   ├── ui/          Card.tsx  Badge.tsx  SquircleAvatar.tsx  Page.tsx
│   ├── squircle-mask.css
│   ├── dashboard/   DashboardClient.tsx
│   ├── org/         OrgChartClient.tsx
│   ├── teams/       TeamsClient.tsx
│   ├── documents/   DocumentsClient.tsx
│   ├── calendar/    CalendarClient.tsx
│   ├── ideas/       IdeasClient.tsx
│   ├── reports/     ReportsClient.tsx  ReportModals.tsx
│   └── settings/    SettingsClient.tsx  Input.tsx
├── tailwind.config.ts                  # theme tokens (canvas/surface/edge/ink, accent)
└── app/globals.css                     # tokens + component classes + squircle + FC overrides
```

---

## Database & security

**Every table has RLS enabled** with a consistent, defense-in-depth policy model:

- **Profiles/org chart** — readable by all members (needed for the org tree); writes limited to self + founders/admins.
- **Documents** — owner or admin only.
- **Document signatures** — immutable audit rows; signer inserts on their own name only; owner/admin can read the full trail.
- **Equity** — read *only by the owner + founders/admins*. Never surfaced to ordinary members.
- **Approvals** — requester sees their own, approvers see assigned, admins see all.
- **Daily reports** — the team feed is readable by all; each user can only write their own row.
- **Audit log** — `REVOKE`d write access; append-only via server-side admin client.

Middleware protects every `/dashboard`, `/org-chart`, `/teams`, `/documents`, `/calendar`, `/ideas`, `/reports`, `/settings` route and refreshes the session on each request.

### E-signature cryptography
The signature hash is **SHA-256** over `document_id | signer_id | timestamp | IP | user-agent | server pepper`, stored hex-encoded in `document_signatures`, plus a mirrored `audit_log` entry. The unknown server pepper makes the stored hash non-replayable-from-the-table alone; the inputs make it reproducible for a real audit. IP is taken from `x-forwarded-for` only behind a trusted proxy.

### Signed URLs
Documents live in a **private** storage bucket. The client never sees bucket keys or the service-role key: uploads request a short-lived signed upload URL server-side, then PUT bytes to it; downloads/previews go through `getDocumentSignedUrl` (60s TTL).

### Team invites
The sidebar **Invite teammates** action opens a modal that issues a scoped invite via the Supabase **admin API**.

- An `invites` row is recorded (email, target **department** + **role title**, inviter, status, `accepted_at`) — auditable and RLS-limited to founders/admins.
- A **full magic-link URL** is generated (`admin.auth.admin.generateLink`) with the invite token embedded in the redirect, so it works **without SMTP configured** (an email dispatch also happens automatically once you enable SMTP in Supabase).
- Visiting `/invite/complete?invite=<token>` assigns the department on the new user's profile, creates a **`roles` row** so they appear on the org chart, and flips the invite to `accepted` (all via the server-only admin client).
- Generating invites is gated server-side to **founders/admins only**.

### Founder-status hardening
`is_founder` is first-class in RLS. Ordinary self-edits can **never** flip `is_founder = true` (a `WITH CHECK` on the self-update policy forbids it), and only an existing founder or admin may grant it to anyone — preventing self-promotion. The org-chart crown badge already reflects the stored `is_founder` flag.

**First-founder bootstrap:** the oldest admin account can claim `is_founder` via a revocable, once-only SQL rule (`bootstrap_first_founder`) that only succeeds when **no founder exists yet**. A banner on the Teams page surfaces this until someone wins the founder role.

**Manage invites panel:** the Teams page (founders/admins only) lists every invite with Resend (regenerates the magic link) and Revoke controls, plus a live view of pending/accepted/revoked status.

**Department tag:** the signed-in user's department is resolved from their `department_id` and shown as a subtle context pill in the header (and inside the profile dropdown).

### Timezone-aware pickers, event editing, overlap warnings
The `DateTimePicker` shows a timezone label next to the selected time and warns with an amber banner when the slot overlaps an existing event. The calendar event form now lets you **edit** an existing event (click it in FullCalendar) with an explicit **timezone** selector (UTC, Europe/*, US, Asia) saved on the event; updating a time-off event resets its linked approval so the manager re-approves. Overlap warnings exclude the event being edited. Requires migration `0005_event_timezone.sql`.

### Tag people on calendar events
Events are many-to-many linked to attendees via `event_attendees` (migration `0006_event_attendees.sql`). In the event form a **Tag people** chip-picker lets the creator tag one or more team members; renamed/removed tags sync via a differential update, and the tagged members render as tiny overlapping avatars directly in the FullCalendar event chip. Requires migration 0006.

### Reusable FilterBar
The `FilterBar` component centralizes date-range + member + status filters (persisted in the URL) and is applied to the Reports feed, the Documents list, and the dashboard global filter.

### Shareable filters (URL query string)
Filter state is persisted in the URL via `lib/useUrlParam`: reports feed (`?from=&to=`), API usage widget (`?range=24h|14d|custom&from=&to=`) and the dashboard global date filter (`?from=&to=` for approvals, recent documents and activity) — every filtered view can be shared by link.

### Custom form controls (no native inputs)
Every dropdown, date/time picker, file upload and range filter is custom-built on Radix primitives: `CustomSelect` (placeholder-safe select), `DateTimePicker` (quick dates Oggi/Domani/Next week + free-form minutes), `DateRangePicker` (presets + dual-month range selection, used to filter the reports feed and the API usage widget), `FileUpload` (styled trigger around a hidden input), and a shared `CalendarGrid`. The only native widget left is the OS file dialog, which is unavoidable.

### Developer API keys
`/developers` (sidebar → Developers) lets members mint scoped API keys for internal tooling. Raw keys are shown exactly once at creation and stored as **SHA-256 hashes**; keys can be revoked at any time. The page also shows an **API usage** section aggregating `api_metrics` (tokens, cost, avg latency, errors, cost-by-provider bars, 14-day trend with 24h/14d toggle). Requires migration `0004_api_keys.sql`.

### Webhooks (`/api/webhooks`)
External services can post to the Celeste activity feed: `POST /api/webhooks` with header `x-webhook-secret: <WEBHOOK_SECRET>` and a JSON body `{ type, recipient_email?, title, body?, target_id? }`. The secret is compared with `timingSafeEqual`; unknown senders get 401. Without `recipient_email` the event broadcasts to founders. Set `WEBHOOK_SECRET` in `.env.local` and point a Supabase Database Webhook at the URL.

### AI (zero-cost)
Idea categorization + one-line summaries use a deterministic keyword heuristic with a gradient path to OpenAI (`OPENAI_API_KEY`) if you provide one. No model call is required for the demo to work.

---

## Key UI patterns (ElevenLabs-inspired)

- **Sidebar** — brand, main nav, a "Pinned" section, bottom invite/devs/settings, collapsible and mobile overlay.
- **Header** — centered global search (⌘K) with quick-action results, Feedback / Docs / Ask-AI, notification bell, and a squircle-avatar dropdown.
- **Cards** — `rounded-[14px]`, hairline `--edge` border, `--shadow-card`, `hover:shadow-card-hover + translateY(-1px)`.
- **Tabs** — underlined section tabs; pressable grouped pills for filters/types.
- **Avatars** — `.squircle` superellipse mask; overlapping stack support.

---

## Command palette & AI assistant

- **⌘K palette** — the header search is a small centered pill (ElevenLabs-style,
  `hidden lg:flex`) that opens a `cmdk` command menu over a **blurred backdrop**: quick
  actions (Morning Standup, EOD, New Idea, Request Time Off — all fire the global
  modals/actions directly) and navigation across every page, filtered as you type.
- **Ask AI (floating)** — a sticky bottom-right button opens a chat panel wired to
  `app/actions/ai-assistant.ts`: it snapshots the workspace (today's calendar, pending
  approvals, recent documents, team) and answers with a real OpenAI call when
  `OPENAI_API_KEY` is set, or a deterministic keyword router otherwise — always
  offline-safe. Removed from the sidebar and header.
- **Standups in the sidebar** now open the Morning Standup **modal directly** (no page
  navigation), via global modal state in `LayoutProvider`.
- **`/approvals` page** — dedicated approvals inbox (sidebar → Approvals): pending
  review with approve/reject, stat cards (pending/approved/rejected) and a review
  history table.
- **`/equity` page** — Equity moved out of Settings into its own sidebar page: your
  grant (total/vested/unvested + vesting chart) plus a founder/admin-only cap table.
- **Cleaner chrome** — dark mode removed (light only for now); the header keeps only
  search/notifications/avatar; **Feedback** moved inside the profile dropdown (below
  Settings) and the department “Leadership” tag lives only there too; the Docs header
  button was dropped (Documents is in the sidebar).

## Operations pack (recent additions)

- **Time-off workflow** — creating a vacation/remote/sick event opens a pending approval to the org-chart manager; approving/rejecting in the dashboard inbox updates the calendar event (pending events render gray with ⏳).
- **Real notifications** — `notifications` table (migration 0003) + Supabase Realtime: the header bell live-updates with approvals, ideas, invites; mark-all-read; dashboard shows an activity feed. Server writes via the admin client; users only read/mark their own.
- **Realtime AI usage** — `/ai-usage` (sidebar → Pinned) streams `api_metrics` in live via Supabase Realtime (migration 0007): big stat cards (tokens / cost / requests / latency, 24h), tokens-per-hour chart, cost-by-provider bars, a shadcn-style table of recent calls, and a **per-team-member** live table (tokens / cost / calls per user, today). The webhook (`/api/webhooks`) accepts a `metric` payload (provider, tokens, cost, latency, `user_email`) to record attributed calls, and a “Simulate call” button lets you test the pipeline end-to-end. The old AI usage widget was removed from Home.
- **Onboarding checklist** — `/onboarding` (sidebar → Pinned): per-user tasks, mark-done → manager approval via `task_approvals`, admin/founder assign flow.
- **Org chart profiles** — person cards show a live **direct-report count badge** (like the reference). Clicking a person opens a profile drawer: photo, name, role, department badge, **“Summarize with AI”** (OpenAI if `OPENAI_API_KEY` is set, otherwise a deterministic digest of their workspace history — standups, ideas, documents, approvals, calendar — cached on `profiles.summarize_with_ai`), bio, location, previous companies, equity vested, manager, direct-reports mini-org-chart, team, and **private notes** (`profile_notes` table, migration 0008): each note is visible only to its author (RLS), one note per teammate.
- **AI provider keys** — `ai_credentials` table (migration 0007): the team stores OpenAI / Anthropic / Google / Groq / Mistral / etc. keys right on the AI usage page. The raw `api_key` column is protected by column-level grants (service role only — it never reaches the browser); members add their own keys, creator-or-admin can delete.
- **Avatar upload** — public `avatars` bucket (migration 0002), per-user write policies, click-to-upload in Settings → Profile.
- **Dark mode** — sun/moon toggle in the header (tokens already supported it).
- **PDF preview** — documents modal renders PDFs in an iframe via the signed URL.
- **Documents upload for everyone** — migration 0009 opens the private `documents` bucket to any member (insert/select/delete in their own `<user_id>/...` folder). Previously the bucket was admin-only, so members got “Upload failed (400)”. Downloads still go through server-generated signed URLs.

## Demo data

```bash
node scripts/create-test-user.mjs              # admin+founder+CEO (ceo@celeste.ai / Celeste@2026)
node scripts/seed-demo.mjs                      # 9 teammates wired to CEO + grants + ideas + events + reports + metrics
```

Both are idempotent and use the service-role key from `.env.local`.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build (type-checks + prerenders)
npm run start      # start prod build
npm run typecheck  # tsc --noEmit
```
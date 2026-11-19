# GroovTasky ’86

### Your day, rewound. Your chaos, organized.

GroovTasky ’86 is a retro-inspired task planner that turns a messy list into a suggested daily or weekly schedule. Think VHS deck meets modern planning assistant: add what’s on your mind, set your availability, and press play on a plan you can review and remix.

It’s designed to make planning feel a little less like another task. You stay in control: generated schedules are recommendations, and a preview must be approved before a new plan replaces the current one.

---

## Table of contents

- [The experience](#the-experience)
- [Features](#features)
- [How Gemini and planning work](#how-gemini-and-planning-work)
- [Getting started](#getting-started)
- [Supabase and Gemini setup](#supabase-and-gemini-setup)
- [Architecture and API](#architecture-and-api)
- [Data, privacy, and security](#data-privacy-and-security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)
- [Project structure](#project-structure)

## The experience

Each area has a distinct personality, connected by a warm cream, teal, orange, olive, burgundy and navy palette.

| Area | What it does |
| --- | --- |
| **Home** | A VHS-inspired landing page introduces the product, the workflow and an example of a daily mix. |
| **Input Deck** | A terminal-style workspace for entering, reviewing and managing tasks. |
| **Daily Tape** | A media-player-inspired view of one day’s scheduled tasks, progress and unscheduled work. |
| **Weekly Mix** | A seven-day programming guide for seeing the week’s scheduled work at a glance. |
| **Archive** | A file-manager-inspired list of saved plan snapshots, with open and delete controls. |
| **The Tape Tech** | A compact contextual helper for questions about a saved workspace and requests to preview a replan. |

The interface adapts to desktop and smaller screens and includes native keyboard controls, visible focus styles, loading feedback, confirmation dialogs and reduced-motion support.

## Features

### Get everything onto the deck

- Add, edit, duplicate and delete tasks, or mark them complete.
- Record a title, description, estimated duration, priority, optional deadline, category and difficulty.
- Select one prerequisite task in the editor. Tasks with unmet dependencies are not placed before their prerequisite.
- Paste multiple lines of natural-language task text into Quick Entry. The parser proposes titles, durations and priorities for review before anything is added. Other task fields use defaults that can be edited afterward.
- Start immediately with realistic sample tasks in browser-local demo mode.

### Set the vibe

Choose a daily or weekly plan and provide a start and end time, daily work limit, break time, lunch start and duration, buffer between tasks, and energy preference. Fixed commitments can be entered one per line as `14:00-15:00`; they apply to each planning day. A work-style preference can also be saved, although it does not currently change the scheduling algorithm.

### Mix a suggested plan

- Generate a **daily tape** or a seven-day **weekly mix** and review the proposed tracks before applying them.
- See scheduled start and end times, task details, priority and duration. Tasks that cannot fit or whose dependencies cannot be satisfied are listed as unscheduled with a reason.
- Switch the daily tape between timeline and compact list views, track completed tasks, inspect workload and move scheduled tasks one day forward.
- Use **Rewind & Replan** to propose a fresh arrangement of unfinished tasks while retaining completed tracks. Replans also require approval.
- Browse, reopen or delete plan snapshots in the archive. A plan’s source indicates whether Gemini assisted or the local scheduling engine was used.

### Signature touches

- **Chaos Meter:** compares estimated unfinished task time with the configured daily availability and displays a playful overload state. It is a workload heuristic, not a prediction.
- **Focus Mode:** opens a task’s description and estimated duration alongside a start/pause countdown and a finish action.
- **Tape Tech:** answers contextual questions about a signed-in user’s saved workspace. It can suggest a replan, but changes still go through a preview.
- **Task indicators:** show priority, category, duration and difficulty to help make the shape of the work visible.

## How Gemini and planning work

GroovTasky uses Google Gemini **server-side** for three optional services:

1. **Quick-entry parsing:** proposes a title, duration and priority for each task line. The user reviews the result before saving.
2. **Planning assistance:** suggests an ordering of task IDs using the saved task list, preferences and any replan request.
3. **Tape Tech:** answers questions using the signed-in user’s saved tasks, preferences and current plan as context.

Gemini output is requested as JSON and checked with Zod. The server filters suggested task IDs against the actual task list. It then uses a **deterministic scheduling engine**, rather than trusting the model to calculate times, to place unfinished work around configured availability, breaks, lunch, commitments, deadlines, dependencies and the daily workload limit. The local engine gives difficult tasks an earlier tie-breaker when morning energy is selected; energy matching is otherwise limited.

Gemini-assisted plans are labeled **SUGGESTED PLAN — AI GENERATED** and include a reminder to review them. If Gemini is unavailable or not configured, the app can instead use its local parser, scheduling engine and limited local helper. Those results are labeled as local—not AI-generated. The fallback keeps core planning available, but it cannot reproduce every AI capability.

**Reliability:** the server bounds concurrent Gemini work, shares identical in-flight requests for the same user and temporarily caches successful identical responses in process memory. Temporary provider-side 5xx responses are retried and may use a configured fallback model. Provider requests can consume quota or incur costs; the cache and queue are not shared across separate server instances. Neither retries nor local fallback guarantee availability during network, hosting, authentication or database outages.

## Getting started

### Requirements

- Node.js 20 or later and npm
- A modern browser
- Optional: a Supabase project for accounts and cross-device storage
- Optional: a Google Gemini API key for AI features

### Run the browser-local demo

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No credentials are needed for the local demo. Tasks, preferences and plans are stored in that browser’s local storage; clearing browser data removes them, and they do not sync across devices.

Useful commands:

```bash
npm run dev        # development server
npm run typecheck  # TypeScript checks
npm run build      # optimized production build
npm run start      # serve a previously built production app
npm test           # API smoke tests; requires a running app server
```

## Supabase and Gemini setup

The full walkthrough—including Supabase authentication, SQL, Gemini credentials, verification and troubleshooting—is in **[SETUP-GUIDE.md](SETUP-GUIDE.md)**.

### Quick setup

1. Create a Supabase project. In its SQL Editor, run [`supabase/setup.sql`](supabase/setup.sql) to create the `groov_workspaces` table and owner-only row-level-security policies.
2. Enable email/password authentication and configure the site URL and confirmation redirects in Supabase.
3. Create a Gemini API key in Google AI Studio and confirm your project can access your chosen model.
4. Copy `.env.example` to `.env.local` and fill in the values:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   GEMINI_API_KEY=YOUR_SERVER_ONLY_GEMINI_KEY
   GEMINI_MODEL=gemini-3.8-flash
   GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
   ```

5. Restart the development server, open the app and sign in. If email confirmation is enabled, confirm the address before signing in.
6. Add a task and wait for **CLOUD SAVED**. Parse a task and generate a plan; check the displayed source to confirm whether Gemini was actually used.

The Supabase URL and publishable/anon key are public client configuration and must be paired with RLS. **Never put a Supabase service-role key or a Gemini API key in a `NEXT_PUBLIC_*` variable.** Keep `.env.local` private; it is ignored by Git. Set an empty `GEMINI_FALLBACK_MODEL` to disable the alternate model. Model availability, billing and quotas depend on your Google project.

### Guest versus signed-in mode

| Capability | Guest / local demo | Signed in with Supabase |
| --- | --- | --- |
| Tasks, preferences and plans | Browser local storage | Private Supabase workspace, synced after changes |
| Quick-entry parsing | Local parser | Gemini when configured and available; otherwise local fallback |
| Schedule generation | Deterministic local engine | Gemini-assisted ordering when available, followed by the same deterministic placement |
| Tape Tech | Limited local responses | Gemini with saved workspace context, or a limited local fallback |
| Cross-device access | No | Yes, after a successful cloud sync |

When an account has no cloud workspace yet, the current browser’s tasks and plans are used as its initial workspace. Cloud updates use a revision number. If another device has changed the workspace, saving pauses rather than silently overwriting it; copy unsaved changes if needed, then use the cloud controls to reload. There is no automatic merge.

## Architecture and API

```text
Browser: Next.js / React UI
  ├── Guest data → browser local storage
  └── Signed-in session → Supabase Auth
         ├── /api/storage → Supabase Data API → Postgres workspace + RLS
         ├── /api/ai/parse-tasks → Gemini or local parser
         ├── /api/plans/generate → Gemini ordering → deterministic scheduler
         └── /api/ai/assistant → Gemini or limited local helper
```

**Stack:** Next.js App Router, React, TypeScript, custom CSS with Tailwind’s base styles, Lucide icons, Zod, Supabase Auth and Postgres, and the Gemini REST API. The Gemini key stays on the server. The server verifies Supabase access tokens and uses the user’s authorization context for cloud access; no service-role key is required.

| Route | Purpose |
| --- | --- |
| `POST /api/ai/parse-tasks` | Parse natural-language task lines and return a preview. |
| `POST /api/plans/generate` | Generate a daily or weekly proposal, including unscheduled reasons and source. |
| `POST /api/ai/assistant` | Answer a question against the authenticated user’s saved workspace. |
| `GET /api/storage` | Load the authenticated user’s saved workspace and revision. |
| `PUT /api/storage` | Save a validated workspace with revision-based conflict detection. |

The database stores one JSON workspace snapshot per authenticated user in `public.groov_workspaces`. It includes tasks, preferences, the current plan and archive. Row-level-security policies restrict access to the owning `auth.uid()`.

## Data, privacy, and security

- Guest data lives in the browser; signed-in workspace data lives in your Supabase project.
- When Gemini is used, task text, planning preferences, relevant workspace data and questions may be sent to Google for processing. Review Google’s terms and your own privacy requirements before entering sensitive content.
- Test your RLS policies using separate authenticated accounts before storing real user data. The Supabase Table Editor has elevated access and is not an RLS isolation test.
- AI responses are suggestions, not instructions or guarantees. Review generated and manually edited schedules.
- The in-memory Gemini queue and cache are bounded per server process, not a distributed abuse-prevention system. Add application-level rate limiting, monitoring, backups, a privacy policy and operational controls before public deployment.

## Testing

Start the app in one terminal, then run:

```bash
npm run typecheck
npm test
```

The smoke tests call the running app and cover local parsing, scheduling around a commitment and dependency, and unscheduled work. The integration suite uses **mock** Supabase and Gemini responses to exercise storage revisions, provider fallbacks and request sharing; it is skipped in the default test run. It does not prove real project credentials, RLS policies or Google model access are configured correctly.

To run the mock integration suite on macOS/Linux, first stop any app server using port 3000. From the project directory, start the isolated mock server:

```bash
NODE_OPTIONS="--require $(pwd)/tests/mock-services.cjs" \
NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-key GEMINI_API_KEY=mock-key npm run dev
```

In a second terminal:

```bash
MOCK_INTEGRATION=1 node --test tests/integration.test.mjs
```

Stop the mock server afterward and restart the normal app without those test variables. The mock must never be enabled in production. For real-provider verification, follow the end-to-end checks in the setup guide.

## Deployment

Build and deploy the Next.js app to a Node-compatible host. Configure the environment variables on that host, run `supabase/setup.sql` against the intended Supabase project, and add your deployed URL to Supabase Auth’s site and redirect settings. Public `NEXT_PUBLIC_*` values are embedded in the client build, so rebuild after changing them. The Gemini key must remain a server-only environment variable.

Verify sign-up, login, cloud save, reload on a second browser, task parsing, plan generation, fallback labeling and RLS isolation before inviting users. A successful local plan alone does not verify the Gemini integration.

## Known limitations

- The same availability and fixed commitments apply to every day in a weekly plan; per-day availability is not implemented.
- Fixed task times are not supported. Manual one-day task moves are not automatically checked for scheduling conflicts.
- The editor supports one prerequisite selection per task. Cycles or unschedulable prerequisites can leave tasks unscheduled.
- Replan requests can influence ordering, but cannot guarantee a particular requested time or day. The deterministic planner does not implement full energy matching.
- The work-style and retro-sound settings can be saved, but currently do not alter scheduling or play sound effects. Focus timers do not persist across page reloads.
- Archive entries are plan snapshots; they do not provide a full historical analytics or comparison system.
- Unsaved cloud changes remain in the open tab after a sync failure, but are not recovered automatically if that tab is closed. Conflicts require manual review and reload.
- The app has no distributed rate limiting or durable job queue. The in-process cache does not coordinate between deployed instances.
- Live Gemini/Supabase integration requires your own credentials, project configuration and verification. External AI uptime cannot be guaranteed.

## Project structure

```text
app/
  api/ai/assistant/       Contextual Tape Tech endpoint
  api/ai/parse-tasks/     Natural-language task parser endpoint
  api/plans/generate/    Plan generation endpoint
  api/storage/           Authenticated workspace load/save endpoint
  page.tsx               Main application and page experiences
  globals.css            Visual identity, layouts and responsive styles
lib/
  gemini.ts              Server-only Gemini calls, retries, cache and queue
  scheduler.ts           Request validation and deterministic placement
  supabase.ts            Browser Supabase client
  server-supabase.ts     Token verification and workspace access
  use-cloud.ts           Client-side cloud synchronization
  types.ts               App types, sample tasks and defaults
  workspace.ts           Workspace validation schema
public/                  VHS artwork
supabase/setup.sql       Workspace table and RLS policies
tests/                   Smoke and mocked integration tests
.env.example             Environment variable template
SETUP-GUIDE.md           Detailed provider setup and troubleshooting
```

---

**GroovTasky ’86 doesn’t tell you how to live your day. It helps you make sense of it.**

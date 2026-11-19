# GroovTasky '86: Gemini + Supabase setup

This guide connects the existing Next.js app to **your own** Gemini API key and Supabase project. You do not need to paste any secret into this chat. The app still works as a browser-local demo without these credentials, but Gemini and cross-device storage require the setup below.

## What the integration does

- Supabase Auth signs users in with email and password. Each signed-in user's tasks, preferences, current plan and archive are stored in a private `groov_workspaces` row in Supabase Postgres. The app uses the user's access token and Row Level Security (RLS), not a service-role key.
- Signed-in changes are saved automatically after a short delay. The cloud indicator reports **CLOUD SAVED**, **SAVING**, **UNSAVED**, **ERROR**, or **CONFLICT**. When signing into an account with no saved workspace, the tasks and plans currently in this browser become its initial workspace.
- Gemini is called **only on the Next.js server**, never directly from browser code. For signed-in users it parses quick-entry tasks, suggests a task ordering, and answers questions in Tape Tech using the saved workspace. Identical requests from the same user share in-flight work and successful responses may be cached in server memory for one minute; the UI labels cached results. Scheduling times are calculated by the deterministic server scheduler, not trusted to Gemini. Review the preview before applying a plan.
- Guests use the local parser and scheduler, not Gemini. If Gemini cannot be reached, parsing and planning fall back to local processing and identify the source; Tape Tech gives a limited, clearly labeled local answer based on the saved workspace. Gemini's suggestions for a replan influence ordering, but cannot guarantee a requested time or day.

## 1. Create your Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and sign in or create an account.
2. Create a new project, choose its organization, name, region and database password, and wait until it is ready.
3. Open the project's **Connect** dialog, or **Project Settings → API Keys**. Copy the **Project URL** and the **publishable key** (or legacy **anon public** key). The URL looks like `https://<project-ref>.supabase.co`.
4. Make sure the project's Data API is enabled and exposes the `public` schema. The publishable/anon key is intended for browser use *only when RLS policies are enabled*. Do **not** use a `service_role` or secret key in `NEXT_PUBLIC_*`.

## 2. Create the private workspace table

1. In that Supabase project, open **SQL Editor**, choose a new query, and paste the complete contents of [`supabase/setup.sql`](supabase/setup.sql).
2. Run the SQL. It creates `public.groov_workspaces`, enables RLS, and creates policies limiting reads, writes and deletion to the signed-in owner's `auth.uid()`.
3. In **Table Editor**, confirm the `groov_workspaces` table exists. In its policies view, confirm RLS is enabled and all four owner policies are present.
4. The application uses the Supabase Data API and this workspace table for cloud storage.

## 3. Configure sign-in

1. In **Authentication → Providers / Sign In**, enable the email provider and email/password sign-in (dashboard wording can vary).
2. Under **Authentication → URL Configuration**, set the **Site URL** to the URL where the app runs, such as `http://localhost:3000`. Add your deployed URL and any needed confirmation redirect URL to the allowlist when you deploy. See [Supabase redirect URL guidance](https://supabase.com/docs/guides/auth/redirect-urls).
3. Supabase may require email confirmation. If enabled, sign up in the app, open the confirmation email in the **same browser**, then return to the app and sign in. If testing without confirmation, change the appropriate confirmation setting in your own Supabase project. For production, configure reliable SMTP rather than depending on development email limits.

## 4. Create a Gemini API key

1. Open [Google AI Studio API keys](https://aistudio.google.com/api-keys) and sign in to Google.
2. Create or select a Google Cloud project and create a Gemini API key. Enable the necessary Gemini API access and billing if your project, model or quota requires it. See [Gemini quickstart](https://ai.google.dev/gemini-api/docs/quickstart) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
3. Copy the key somewhere private. Do not share it, commit it, use it as a Supabase key, or put `NEXT_PUBLIC_` in front of it. The default model is `gemini-3.8-flash`; if it is unavailable to your project, use a supported model ID your project can access. Google restricts the older `gemini-2.5-flash` to projects that previously used it, so it may return HTTP 404 for new projects. Use a bare model ID without the `models/` prefix.

## 5. Add environment variables and start the app

From the project folder:

```bash
npm install
cp .env.example .env.local
```

On Windows Command Prompt use `copy .env.example .env.local` instead. Open `.env.local` on your own machine and replace the placeholders:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_LEGACY_ANON_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
```

Keep the values from the **same** Supabase project. `.env.local` is git-ignored. If deploying, enter the same variables in your hosting provider's environment settings; `GEMINI_API_KEY` is server-only. Restart/redeploy the Next.js app after changing variables: public values are compiled into the client bundle.

```bash
npm run dev
```

Open `http://localhost:3000`. In a hosted preview, configure environment variables on the server hosting that preview rather than on your own computer.

## 6. Verify the complete flow

1. Click **SIGN IN** in the top bar. Select **CREATE ACCOUNT**, enter an email and password, and confirm your email if prompted. Then sign in.
2. Open **INPUT DECK**, add or edit a task, and wait until the top bar reads **CLOUD SAVED**. In Supabase Table Editor, confirm a row appears in `groov_workspaces`. The `user_id` should match the signed-in user. Avoid exposing real task content while testing.
3. In Quick Entry, type `Finish portfolio — 2 hours — High`, click **PARSE TASKS**, and verify the review dialog says **Parsed using Gemini** and the model name. Confirm before saving.
4. Click **SET THE VIBE**, set availability, then **GENERATE MY PLAN**. The preview should identify its source as **Gemini (model name) + deterministic scheduling engine** and show **SUGGESTED PLAN — AI GENERATED**. Review and apply. If it says local/demo, see troubleshooting below.
5. Ask **THE TAPE TECH** a question about your saved tasks. Its response uses the saved workspace; requests to change the plan lead to a preview, not an automatic schedule edit.
6. Refresh the page, sign in with the same account on a second device/browser, and confirm your tasks and plans appear. Changes sync after a short delay. Simultaneous edits on two devices can produce a conflict rather than silently overwriting one another.
7. For an isolation check, create another account and confirm it cannot read the first account's workspace. The Table Editor uses administrator privileges and is not a valid RLS isolation test. Test via signed-in application sessions or Supabase's authenticated clients.

## Troubleshooting

- **SIGN IN says not configured:** check spelling and values of both `NEXT_PUBLIC_SUPABASE_*` variables, restart the server and reload the browser. For a deployment, rebuild/redeploy after setting them.
- **Sign-up or confirmation fails:** check the email provider, Site URL, redirect allowlist, confirmation settings and Supabase email/SMTP logs. If signup needs confirmation, sign in only after clicking the email link.
- **Cloud shows ERROR / no table:** run `supabase/setup.sql` in the *same project* as your URL/key. Confirm Data API access, RLS policies, network access and that the account is signed in. Click the cloud status to see the error. If an ordinary save failed, use **RETRY SAVE**. Unsaved edits remain in that tab until it is closed or reloaded.
- **CONFLICT:** another device saved since this tab loaded. Saving pauses. Copy any unsaved work you need first, click the cloud indicator, then choose **RELOAD CLOUD**; this discards unsaved changes in this tab. There is no automatic merge yet.
- **Gemini not configured / local fallback:** sign in first, check `GEMINI_API_KEY` and `GEMINI_MODEL` on the server. For HTTP 404, set `GEMINI_MODEL=gemini-3.8-flash` in `.env.local` (or your host environment), restart/redeploy, and confirm that your Google project can access the model. Check model access, quota and billing, and inspect the server logs. Existing `.env.local` values override the new default. The browser receives a generic error and no secret. A successful local plan is **not** evidence that Gemini worked.
- **Gemini HTTP 503 / temporarily unavailable:** This usually means Google or that model is overloaded. The app retries a transient 5xx once per model, then tries the configured fallback model (up to four provider calls total). Wait and retry later, check the [Google Cloud status dashboard](https://status.cloud.google.com/), or try `GEMINI_MODEL=gemini-3.5-flash-lite` in your server environment and restart. Each attempt can count toward quota or cost. Set `GEMINI_FALLBACK_MODEL=` to disable the alternate model. The exact model used is shown in the result. No retry strategy can guarantee availability.
- **Tape Tech returns unavailable:** it requires an authenticated, saved cloud workspace and working Gemini credentials. Open the cloud status and retry after syncing.
- **Auth works but data isn't shared:** check you're signing into the same Supabase project and email on both devices and see **CLOUD SAVED** before switching. Guest data is local to each browser.

## Security and production notes

RLS isolates each user's workspace; test your policies before storing sensitive data. The server uses a public key plus the user's token and verifies the user with Supabase Auth. No service-role key is needed. Workspace contents and questions sent to Gemini are processed by Google; do not send confidential data unless your privacy requirements and Google's terms allow it. This implementation has a per-server-process concurrency limit and a short-lived, user-scoped in-memory cache, but no distributed rate limiting or cross-instance queue; it also has no automatic conflict merge or background recovery of unsaved changes after closing a tab. Retries can count toward provider quota. Neither the app nor a fallback can guarantee AI availability during a provider, network, database or hosting outage. Add rate limiting, abuse controls, monitoring, backups, and a privacy policy before a public launch. The original app also retains scheduling limitations described in the README.

## Tests

`npm test` runs local API smoke tests against a running app and skips the optional mocked integration test unless `MOCK_INTEGRATION=1`. The integration test uses a **test-only** fetch mock; it does not verify your actual Supabase project, RLS configuration or Google account. The verification steps above are required for that.

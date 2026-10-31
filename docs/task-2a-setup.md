# Task 2A: resident master setup

## What is implemented

Resident masters have exactly two database columns: a database-generated UUID `id` and a required `name`. The existing Residents directory can create, reopen and rename these records. The original navigation, selectors, cards and form styles remain. Company/home/room columns display **Not assigned**; no such attributes are stored, and selectors cannot filter unassigned masters before resident periods exist.

No resident periods, funding, occupancy, revenue, billing, dashboards or authentication were added. Existing Task 1 reference/demo code is not used for resident master storage.

## Access control decision

**This version is local-only, not an authenticated multi-user deployment.** Keep using fictional names for this task. Your published GitHub Pages demo is unchanged and is not connected to Supabase.

`npm run dev` and `npm start` run a custom Next.js server that binds exclusively to `127.0.0.1`. The API checks the socket's loopback peer, the exact local Host and, for writes, the same-origin browser Origin. Forwarded proxy headers, cross-site requests, non-local hosts and remote peers are rejected. Never tunnel, publicly proxy or port-forward this server. These local-machine controls are not a substitute for user authentication or tenant authorization. Anyone with access to the local computer is trusted in this interim mode.

The Supabase client is imported only by this server, with session persistence disabled. It uses a server-only secret key, never a `NEXT_PUBLIC_*` variable. The browser calls only the local server and receives only resident IDs/names. Errors omit upstream database details. No secret or password belongs in GitHub, browser JavaScript, chat or a public Pages deployment.

The migration enables and forces RLS, revokes all table privileges from `PUBLIC`, `anon` and `authenticated`, and adds **no policies**. The trusted server uses the Supabase secret/service role, which bypasses RLS. Public and signed-in browser roles have no table access. A later agreed sign-in model must also define company/home authorization before this feature is made public. Do not solve that dependency by adding `using (true)` or unrestricted write policies.

## Apply the database migration to your existing project

1. Open project **hmgzswvngsehrazfzwsf** in the Supabase dashboard.
2. Open **SQL Editor → New query**.
3. Paste the contents of [`supabase/migrations/202610310001_resident_master.sql`](../supabase/migrations/202610310001_resident_master.sql) and run it once.
4. Confirm the new `public.residents` table contains only `id` and `name`, RLS is enabled, and no policies exist.

If a `public.residents` table already exists, stop and inspect it first. The migration deliberately fails rather than silently accepting or replacing an unknown schema or data. No existing project schema has been inspected or changed from this session.

If you already use the Supabase CLI for this project, the same file is a standard migration under `supabase/migrations/`; review the CLI's pending migrations before pushing to project `hmgzswvngsehrazfzwsf`.

## Configure the local application

Requires Node.js **24.5 or newer** and npm. The Node proxy option respects configured proxy/CA trust in managed environments; it does not disable TLS verification.

1. Check out branch `feat/resident-master-supabase` on your computer.
2. Run `npm ci` in the repository.
3. Copy `.env.example` to **`.env.local`**.
4. Keep `SUPABASE_URL=https://hmgzswvngsehrazfzwsf.supabase.co`.
5. In Supabase project settings, find **API Keys**. Enter a server **secret key** (or the legacy `service_role` key) as `SUPABASE_SECRET_KEY` in `.env.local`. Use only this ignored local file or a secure environment-variable binding; never share the key in chat. A publishable/anon key will not provide resident access and should not be used here.
6. Run `npm run dev`. Open `http://127.0.0.1:3000` on that same computer and choose Residents.

For a local production preview: stop the dev process, run `npm run build`, then `npm start`. Connection variables are read at server startup, not embedded into the production build. Restart the application after changing `.env.local`. Missing configuration produces an explicit unavailable message; it does not fall back to temporary storage or claim a save succeeded.

An account/project visible in the Supabase website does not automatically authorize this development environment. This session has no Supabase binding or connector. To test the live project here later, supply the server key securely through environment settings and allow HTTPS to `hmgzswvngsehrazfzwsf.supabase.co`. Do not expose this local server through a public cloud preview.

## Verification

```sh
npm run build
npm run typecheck
npm run test:server
npx playwright install chromium
npm test
```

On Linux, Playwright may need `npx playwright install --with-deps chromium`. To use an installed Chromium, run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`.

- PostgreSQL tests apply the real SQL migration to a disposable embedded PostgreSQL database (PGlite). They verify the two columns, UUID generation, required names, RLS flags, absence of policies, denied reads/writes for `anon` and `authenticated`, trusted-role writes, and records after closing/reopening the database.
- API tests use the real Supabase JavaScript client against a local **PostgREST test double**, not the hosted project. They verify creation, different IDs, reopening, editing, and records surviving two actual application-process restarts. They also test invalid input, unknown IDs and denied cross-origin requests.
- Browser tests use the same test double, exercise the production app, and check form saves/reopening, error handling with no false success, navigation, selector persistence/reset and tablet layout.
- Tests use only fictional information and do not need or mutate your actual Supabase project.

**Not yet verified:** applying the migration or storing/reopening records in project `hmgzswvngsehrazfzwsf`. That requires the secure connection above. Local automated results are not a claim of hosted Supabase readiness.

After configuring the real project, verify in the local app: create two fictional residents; confirm distinct UUIDs; reopen one; rename and save it; stop the entire app process; run `npm start` again; reopen the same UUID and confirm the new name. Confirm the same row in Supabase's Table Editor. Verify a public/anon client cannot select, insert or update `public.residents` before considering a public deployment. No live-data completion claim should be made until those checks pass.

## Hosting and review

Task 2A cannot be hosted as the existing GitHub Pages static demo: GitHub Pages cannot run the private local API. `GITHUB_PAGES=true npm run build` intentionally refuses to export this branch. The already-deployed Task 1 files on `gh-pages` are untouched. Do not merge generated website files into this branch.

Review and merge this source branch separately. Stop after Task 2A; resident periods and an authenticated deployment require further approval.

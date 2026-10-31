# Care Home Revenue

Next.js / TypeScript application for care home revenue management. Task 2A extends the existing interface with resident master creation, reopening and name editing backed by Supabase. Resident masters contain **only ID and name**.

This branch is **local-only** until authentication and company/home authorization are agreed. Your existing public GitHub Pages demonstration remains unchanged. Do not put Supabase privileged keys in browser code or publish an unrestricted database.

## Setup and run

See [Task 2A setup](docs/task-2a-setup.md) for the SQL migration, secure connection configuration, local startup and remaining access-control requirements.

With Node.js 24.5+, after applying the migration and configuring the ignored `.env.local`:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000 on the computer running the app. For a production preview, stop dev and run `npm run build` followed by `npm start`. Both servers listen only on loopback. Without Supabase configuration, the UI reports that resident storage is unavailable.

## Checks

```sh
npm run build
npm run typecheck
npm run test:server
npx playwright install chromium
npm test
```

The server tests verify PostgreSQL migration/RLS behaviour, input/access controls and restart persistence with a PostgREST test double. Browser tests verify the resident forms, errors, preserved navigation/selectors and tablet layout. They do not connect to the live Supabase project; see the setup guide for that outstanding verification.

## Main files

- `app/residents/`, `components/resident-master-form.tsx`: directory and two-field forms using the existing layout.
- `lib/resident-master.ts`, `lib/resident-api.ts`: resident master type and browser-to-local-server requests.
- `server/`, `scripts/local-server.mjs`: loopback-only HTTP boundary and server-only Supabase client.
- `supabase/migrations/`: resident master schema with RLS and no public access policies.
- `.env.example`: connection variable names only; real values stay in ignored local configuration.
- `tests/`: browser, PostgreSQL, access-control and restart tests using fictional data.

No periods, funding, calculations, billing, new dashboards or additional resident fields are implemented in Task 2A.

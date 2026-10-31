# Task 2B — resident periods and funding

Implemented on `codex/task-2b-resident-periods-funding`, based on `feat/resident-master-supabase`.

## Open locally

Use the existing ignored `.env.local` with `SUPABASE_URL` and server-only `SUPABASE_SECRET_KEY`. No connection secrets changed. With Node.js 24.5+:

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:3000/residents. For a production preview, stop dev, then run `npm run build` and `npm start`. Both bind only to loopback. The existing Task 2A access restrictions apply to every new API route. No browser database permissions or authentication were added.

## What to try

1. Create or open a fictional resident. ID and name remain the only resident master fields.
2. Choose **Add Period**. Enter dates, home, a room from that home, stay/care types, the admission/discharge and occupancy indicators, and optional comments.
3. Add any number of funding entries. Local Authority requires a Local Authority reference; NHS and FNC require an NHS ICB reference. Other funding types have no funder selection. Amounts are manual and nonnegative. The weekly fee is the sum of the entered amounts.
4. Save, then choose **Add Period** again. Attributes and funding are copied. Enter the new start date and amend the snapshot. Its predecessor closes on the preceding day during the same database transaction.
5. Open a historical period to edit it directly. Start corrections adjust the preceding continuation's end; end corrections adjust the following continuation's start. Changes that reorder periods, overlap, invalidate a date range, remove an end before another period, or conflict with stay boundaries are rejected and rolled back.
6. For a discharge, select Yes and enter an end date. A later Add Period defaults to a new admission and preserves the gap. Both flags can be Yes for a single-period stay. Historical discharge/readmission gaps are never filled automatically.
7. For a transfer from an ongoing stay, Add Period and change home and room. The new admission indicator defaults to Yes; saving marks the originating period as discharged and ends it the day before the transfer. Earlier periods retain their home and funding. A new admission after an already discharged stay preserves its gap, including when the receiving home differs.
8. Open **Settings** to add or edit companies, homes, rooms and funders. Used relationships cannot be invalidated. A funder used in funding history cannot change category; create a new reference instead. Fictional initial records are supplied.
9. Restart the app and reopen the resident to inspect persisted periods and funding.

Company and Care Home selectors use database reference records. The resident directory filters against matching period history and displays each resident's latest recorded home/room. These columns are descriptive history, not an occupancy calculation. Unassigned masters remain visible with All Companies / All Homes selected.

## Database delivery

Before changes, the hosted development project `hmgzswvngsehrazfzwsf` contained just `residents`, with three records, RLS enabled, and migration `20261031202009_resident_master` applied. The Task 2A SQL file's existing filename differs from its hosted migration timestamp; it was retained to preserve history. Do not blindly push all local migrations to this existing project or replay Task 2A.

Task 2B's version-controlled migration is `supabase/migrations/20261031211440_resident_periods_funding.sql`, generated with the Supabase CLI and applied through the connector as `resident_periods_funding`. The connector assigned hosted timestamp `20261031211751`. It adds six tables, foreign keys, checks, indexes, RLS and a restricted security-invoker save function. It preserves resident masters and adds only fictional reference data. Inspect hosted migration history before any future migration push.

`save_resident_period` locks the resident row, adjusts neighbouring dates, saves the period and replaces only that period's funding inside one PostgreSQL transaction. A failure rolls back all changes. Browser roles cannot execute the function or access the tables. Credentials remain exclusively in the trusted local HTTP server.

## Verification

```powershell
npm run typecheck
npm run build
npm run test:server
npx playwright install chromium
npm test
```

An installed Chrome can be used instead of downloading Chromium:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm test
```

- PostgreSQL tests cover first/open/fixed-term periods, copied funding, unchanged historic fees, both neighbouring date corrections, invalid/reordered/overlapping dates, discharge/readmission gaps, both flags, transfers, room/home relationships, funder categories, atomic rollback, denied browser roles, and persistence after database reopen.
- Browser tests cover master regression, navigation/selectors, period creation, multiple funding entries, copied amounts, historical editing, transfer, reload, tablet layout, and reference creation/editing. They use the real SQL migrations in an embedded PostgreSQL-backed PostgREST test fixture, not the hosted database.
- Existing API process-restart tests still verify resident master persistence. Embedded PostgreSQL reopen tests verify period and funding persistence. A separate local API save and process-restart check against hosted Supabase also verified two persisted periods, with the original £1,000 fee retained and the new period at £1,050. Browser interaction itself is tested against the disposable fixture.
- A live Supabase transaction verified first/continuation saves, FNC funder selection, automatic closing, and rollback on an invalid amount. This transaction was rolled back. A subsequent local API persistence check retained one clearly named `Fictional Task 2B verification` resident with two periods; all three original resident masters remain unchanged.
- Supabase security advisors reported only informational RLS-without-policy notices, which match the intentional local-only server access model; no warnings/errors.

Windows sandbox filesystem restrictions caused WebAssembly restart failures in both the existing and new PostgreSQL tests. Running the suites outside that sandbox resolved them. Playwright's bundled browser was unavailable; installed Chrome was used successfully.

No occupancy dashboard, revenue forecast, billing, automatic rate updates or additional resident fields were introduced. Task 2B ends here.

The delivery preview uses http://127.0.0.1:3003/residents because port 3000 was already occupied. To start it on that port again: `$env:PORT="3003"; npm start`.

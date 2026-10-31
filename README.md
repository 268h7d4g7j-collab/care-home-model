# Care Home Revenue

A Next.js / TypeScript visual foundation for a multi-company care home revenue application. All companies, homes, residents, funders, dates and fees are fictional.

## Run locally

Requires Node.js 20.9 or newer (validated with Node 24) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000 in your browser. The Dashboard is a placeholder; select **Residents** in the sidebar to explore the implemented screens. Select a company/home, then choose **View record**. Selections persist during client-side page navigation, and reset on a full reload. Changing company resets the home to All Homes.

For a production build and local preview:

```sh
npm run build
npm start
```

Open the same address. Stop the development server before starting the production preview on port 3000.

## Validate

```sh
npm run typecheck
npx playwright install chromium
npm run build
npm test
```

On Linux, Playwright may require OS libraries: `npx playwright install --with-deps chromium`. To use an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` when running `npm test`. Browser tests start the production server automatically if port 3000 is unused. They cover navigation, selection persistence and resets, home options, resident filtering, reference funders, read-only fields, funding totals, chronological history and tablet layout.

## Structure

- `app/`: shared layout, Residents routes and placeholder Dashboard, Occupancy, Revenue and Settings routes.
- `components/`: persistent navigation/scope provider, resident form and placeholder screen.
- `lib/data.ts`: typed demonstration records and separate company, home, room and funder reference structures. Stable IDs and relationships leave room for a future PostgreSQL persistence layer; no database is connected.
- `tests/`: Playwright browser acceptance checks.

## Scope and limitations

Resident details and periods are deliberately read-only. Disabled dropdowns show the proposed reference choices, with Local Authority and NHS funders selected from the separate reference list. There is no saving, period editing/creation, authentication, billing, accounting integration, production database or occupancy/revenue calculation. Only the illustrative total weekly fee is summed from each period's funding entries.

The directory is scoped by each resident's latest period. An open resident record remains visible when selectors change, with a notice if it falls outside the selection; its complete history remains visible. Period history includes all snapshots in ascending start-date order. Placeholder modules have no operational functionality.

Work is on `feat/application-foundation` for review before merging. No later modules are implemented.

## GitHub Pages demo

The fictional demo can be served without a Node.js server. `GITHUB_PAGES=true npm run build` exports the site to `out/` with the `/care-home-model` URL prefix and directory-based routes. Normal local development and production builds keep their existing behaviour.

The prepared site is published on the `gh-pages` branch. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select **gh-pages** and **/ (root)**, then **Save**. The expected address is https://268h7d4g7j-collab.github.io/care-home-model/ once GitHub completes deployment. All content is fictional and the site has no authentication or data storage.

To refresh this demo, rebuild with the same command and commit the contents of `out/` to `gh-pages`, including an empty `.nojekyll` file. Keep source development on the review branch; generated files belong only on `gh-pages`.

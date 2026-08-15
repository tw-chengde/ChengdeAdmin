# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `app/` and follows Next.js App Router conventions.
Dashboard views are in `app/dashboard/`; reusable hooks, domain types, utilities,
and server integrations belong in `app/hooks/`, `app/types/`, `app/utils/`, and
`app/lib/` respectively. Better Auth is configured in `auth.ts` at the repository
root, not under `app/lib/`; import `getSession()` from there for server-side
session checks. Static files go in `public/`, Drizzle-generated D1 migrations and
metadata in `migrations/`, and Worker bootstrap code in `worker/`. Tests live in
`tests/`, with shared fixtures under `tests/mocks/`.

Per-platform integrations live in `app/lib/platforms/`: `connector.ts` and
`types.ts` define the shared contract, `registry.ts` maps a platform code to its
connector, and each platform gets its own module (`momo.ts`, `mo-store-plus.ts`).
Add a new platform there rather than branching on the platform code inside views.
Anything a view needs to vary per platform — display metadata, the order-status
dropdown options — belongs on `PlatformDefinition`, not in a lookup table keyed
by platform code inside the component.

`definitions.ts` (display data) and `registry.ts` (connectors) are deliberately
separate: connectors pull in the platform API clients and their credentials, so
they must never enter the client bundle. Client components import
`definitions.ts`; only server actions import `registry.ts`. `tests/project.test.ts`
walks the import graph and fails if a `"use client"` module reaches `registry.ts`.

Each connector is built by a factory (`createMomoConnector`,
`createMoStorePlusConnector`) that accepts a `createClient` provider, so tests
inject a fake client instead of setting `process.env` and overwriting
`globalThis.fetch`. Shared plumbing lives in `config.ts` (every platform
environment variable, and whether it is required), `platform-http.ts` (the
POST-JSON transport and its error messages), and `mapper-utils.ts` (the
value-coercion and grouping helpers every mapper needs).

`connector.ts` deliberately separates the order-level and statistics-level
queries. `fetchOrders` returns real `OrderItem`s for the orders page;
`fetchSalesStatistics` returns a `PlatformSalesStatistics` aggregate
(`sales.ts`) for the overview, because some platforms only expose
goods-level totals with no dates and no order identity. Do not smuggle a
use case through `PlatformOrderQuery.status` — that field carries a
platform-native status value, and a sentinel there forces the connector to
dress non-orders up as orders. `summarizeOrders` in `sales.ts` gives any
platform that does return orders the shared aggregation.
Documentation, OpenAPI schemas, and platform integration guides are index-mapped in [docs/AGENTS.md](./docs/AGENTS.md).
Before implementing or changing an integration with a third-party platform API,
read the applicable specification in `docs/` and implement against that
specification.

`app/dashboard/(platform-aware)/` is a route group, so it does not appear in
URLs. `tests/project.test.ts` asserts that every `href` in
`app/dashboard/nav-items.ts` resolves to a real `page.tsx`, so a new nav entry
must ship with its route in the same change.

`functions/` holds standalone npm workspaces that deploy separately from the
Worker. `functions/momo-proxy` is a Google Cloud Function with its own
`package.json` and `tsconfig.json`; it is covered by `tests/momo-proxy.test.ts`
but is not part of the Worker bundle.

## Build, Test, and Development Commands

- `npm install`: install the locked dependency set.
- `npm run dev`: start the vinext development server at `localhost:3000`.
- `npm run build`: create the production Worker and client bundles.
- `npm run preview`: serve the built Worker locally with Wrangler on port 3000.
- `npm test`: run the Vitest suite once.
- `npm run test:watch`: rerun affected tests while developing.
- `npm run typecheck`: validate TypeScript without emitting files.
- `npm run lint`: run ESLint across the repository.
- `npm run db:migrate:local`: apply D1 migrations to the local database.
- `npm run db:generate -- --name=<name>`: generate a Drizzle migration from schema changes.

After adding or modifying functionality, `npm test`, `npm run typecheck`, and
`npm run lint` must all pass before the changes may be submitted.

## Database Migrations

`app/lib/schema.ts` is the single source of truth for the complete D1 schema,
including Better Auth tables. Update that schema first, then run
`npm run db:generate -- --name=<name>`. Review the generated SQL and commit it
together with the corresponding `migrations/meta/` changes.

Use `npm run db:migrate:local` to validate every generated migration before
using `npm run db:migrate:remote`. Do not manually edit Drizzle snapshot or
journal metadata.

## Coding Style & Naming Conventions

All code must strictly follow Clean Code principles and SOLID design principles.

Use TypeScript, React functional components, and two-space indentation. Follow
existing formatting: double quotes, semicolons, and trailing commas where valid.
Name components and exported types in PascalCase (`ProductsView`), hooks with a
`use` prefix (`useOrdersViewModel`), and utilities in camelCase. Use kebab-case
filenames for UI modules and descriptive domain filenames such as
`app/utils/products.ts`; hook files instead take the hook's own name, as in
`app/hooks/useOrdersViewModel.ts`. Keep server-only actions marked with
`"use server"` and avoid importing them into generic client utilities.

## Testing Guidelines

Tests use Vitest and Testing Library. Name files `*.test.ts`, `*.test.tsx`, or
`*.test.mjs`; mirror the feature name, for example
`tests/products-view.test.tsx`. Prefer user-visible behavior for component tests
and focused input/output cases for utilities. Add regression coverage with bug
fixes. Use test-driven development: first add or update a failing test that
describes the intended behavior, then implement the smallest change to make it
pass, and refactor while keeping the test suite green. Cover new branches, and
do not submit changed behavior with failing tests.

`vitest.config.ts` splits the suite into two projects by execution environment,
because most of this codebase does not run in a browser. The `ui` project gets
jsdom and the Testing Library `cleanup` in `tests/setup.ts`; the `node` project
gets neither, so platform clients, mappers, server actions, and migrations are
tested without a `window` or `document` they will not have at runtime. Selection
is by filename: `*.test.tsx` and `use*.test.ts` go to `ui`, everything else to
`node`. A hook test must therefore keep the hook's own `use` prefix
(`tests/useOrdersViewModel.test.ts`) or it lands in `node` and fails on the
missing DOM. Run one side alone with `npx vitest --project=ui`.

## Commit & Pull Request Guidelines

Recent history generally follows Conventional Commits, such as
`feat(config): add observability configuration` and
`refactor(dashboard): improve OrdersView testability`. Use an imperative subject
with an appropriate type (`feat`, `fix`, `refactor`, `chore`, `test`, or `docs`)
and optional scope. Pull requests should explain the motivation and behavior,
list verification commands, link relevant issues, and include screenshots for
visible UI changes. Call out D1 migrations or configuration changes explicitly.

## Security & Configuration

Copy `.env.example` to `.env` for local work; `.dev.vars` works too when running
under Wrangler. In production, set the same values with `wrangler secret put`.
Never commit OAuth credentials, `BETTER_AUTH_SECRET`, or other secrets. Every
variable `auth.ts` reads through `requireEnv` is mandatory — a missing one throws
at first request rather than degrading quietly. Test migrations locally before
using `npm run db:migrate:remote`, since that command changes the shared remote
database.

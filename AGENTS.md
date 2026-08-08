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

`app/dashboard/(platform-aware)/` is a route group, so it does not appear in
URLs. `tests/project.test.mjs` asserts that every `href` in
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

Use TypeScript, React functional components, and two-space indentation. Follow
existing formatting: double quotes, semicolons, and trailing commas where valid.
Name components and exported types in PascalCase (`ProductsView`), hooks with a
`use` prefix (`useOrdersViewModel`), and utilities in camelCase. Use kebab-case
filenames for UI modules and descriptive domain filenames such as
`app/utils/products.ts`; hook files instead take the hook's own name, as in
`app/hooks/useOrdersViewModel.ts`. Keep server-only actions marked with
`"use server"` and avoid importing them into generic client utilities.

## Testing Guidelines

Tests use Vitest, jsdom, and Testing Library. Name files `*.test.ts`,
`*.test.tsx`, or `*.test.mjs`; mirror the feature name, for example
`tests/products-view.test.tsx`. Prefer user-visible behavior for component tests
and focused input/output cases for utilities. Add regression coverage with bug
fixes. Cover new branches, and do not submit changed behavior with failing tests.

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

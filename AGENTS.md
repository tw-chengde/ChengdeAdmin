# Repository Guidelines

## Structure

- Next.js App Router code lives in `app/`; dashboard pages live in `app/dashboard/`.
- Reusable hooks, types, utilities, and server integrations belong in `app/hooks/`,
  `app/types/`, `app/utils/`, and `app/lib/`.
- Server-side authentication uses `getSession()` from root-level `auth.ts`.
- Static files, D1 migrations, Worker code, and tests live in `public/`,
  `migrations/`, `worker/`, and `tests/` respectively.

## Platform integrations

- Put each platform in `app/lib/platforms/` and implement its connector through a
  factory that accepts a `createClient` provider for tests; register both its
  connector and display definition.
- Keep display data in `definitions.ts` and server-only connectors in `registry.ts`.
  Client components must never import `registry.ts`.
- Define platform environment settings in `config.ts`.
- Put platform-specific view metadata, including status options, on
  `PlatformDefinition`; do not branch on platform codes in views.
- `fetchOrders` returns real orders; use `fetchSalesStatistics` for overview
  aggregates. Do not overload `PlatformOrderQuery.status` for other use cases.
- Before changing a third-party integration, read its applicable specification in
  `docs/` (see `docs/AGENTS.md`) and implement against it.

## Routes and deployments

- Add a matching `page.tsx` whenever adding an entry to `app/dashboard/nav-items.ts`.
- `functions/momo-proxy` is a separate Cloud Function workspace, not part of the
  Worker bundle.

## Database

- `app/lib/schema.ts` is the source of truth. Update it first, then run
  `npm run db:generate -- --name=<name>`.
- Commit generated migrations and metadata together. Do not edit migration
  snapshots or the journal manually.
- Validate with `npm run db:migrate:local` before any remote migration.

## Code and tests

- Use TypeScript, functional React components, two-space indentation, double
  quotes, semicolons, and trailing commas where valid.
- Use PascalCase for components/types, `use`-prefixed hook names, camelCase
  utilities, and kebab-case UI filenames.
- Mark server actions with `"use server"` and keep them out of client utilities.
- Use TDD: add or update a failing focused test before implementing changed
  behavior. UI tests use `*.test.tsx`; hook tests must be named `use*.test.ts`;
  other tests run in node.
- After changes, run `npm test`, `npm run typecheck`, and `npm run lint`.

## Security

- Use `.env` or `.dev.vars` locally and Wrangler secrets in production.
- Never commit credentials, OAuth tokens, or `BETTER_AUTH_SECRET`.

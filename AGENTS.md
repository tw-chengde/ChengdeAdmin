# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `app/` and follows Next.js App Router conventions.
Dashboard views are in
`app/dashboard/`; reusable hooks, domain types, utilities, and server integrations
belong in `app/hooks/`, `app/types/`, `app/utils/`, and `app/lib/` respectively.
Static files go in `public/`, Cloudflare D1 migrations in `migrations/`, and Worker
bootstrap code in `worker/`. Tests live in `tests/`, with shared fixtures under
`tests/mocks/`.

## Build, Test, and Development Commands

- `npm install`: install the locked dependency set.
- `npm run dev`: start the vinext development server at `localhost:3000`.
- `npm run build`: create the production Worker and client bundles.
- `npm test`: run the Vitest suite once.
- `npm run test:watch`: rerun affected tests while developing.
- `npm run typecheck`: validate TypeScript without emitting files.
- `npm run lint`: run ESLint across the repository.
- `npm run db:migrate:local`: apply D1 migrations to the local database.

After adding or modifying functionality, `npm test`, `npm run typecheck`, and
`npm run lint` must all pass before the changes may be submitted.

## Coding Style & Naming Conventions

Use TypeScript, React functional components, and two-space indentation. Follow
existing formatting: double quotes, semicolons, and trailing commas where valid.
Name components and exported types in PascalCase (`ProductsView`), hooks with a
`use` prefix (`useOrdersViewModel`), and utilities in camelCase. Use kebab-case
filenames for UI modules and descriptive domain filenames such as
`app/utils/products.ts`. Keep server-only actions marked with `"use server"` and
avoid importing them into generic client utilities.

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

Copy `.env.example` to `.env` for local work. Never commit OAuth credentials,
`AUTH_SECRET`, or other secrets. Test migrations locally before using
`npm run db:migrate:remote`, since that command changes the shared remote database.

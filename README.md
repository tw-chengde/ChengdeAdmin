# Chengde Admin

Chengde Admin is an internal administration dashboard built with Next.js, React,
Material UI, and [vinext](https://github.com/cloudflare/vinext). It runs on
Cloudflare Workers, uses D1 for persistence, and authenticates users with Google
through Better Auth.

## Features

- Google sign-in and protected dashboard access
- Dashboard overview and navigation
- Product catalog and inventory management
- Order review and order-merging workflows
- Multi-platform support (`MOMO_MAIN`, `MO_STORE_PLUS`) with a connector
  registry and a shared platform settings page

## Prerequisites

- Node.js `>=22.13.0`
- npm
- A Google OAuth application for authentication
- A Cloudflare account when working with the remote D1 database or deployment

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file and fill in the Google OAuth credentials:

   ```bash
   cp .env.example .env
   openssl rand -base64 32
   ```

   Use the generated value for `BETTER_AUTH_SECRET`, keep `BETTER_AUTH_URL` at
   `http://localhost:3000`, and fill in `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`. For local authentication, add
   `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
   in the Google OAuth application.

3. Apply the D1 migrations locally:

   ```bash
   npm run db:migrate:local
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create the production Worker and client bundles |
| `npm run preview` | Serve the built Worker locally with Wrangler on port 3000 |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Check TypeScript types without emitting files |
| `npm run lint` | Run ESLint |
| `npm run db:create` | Create the Cloudflare D1 database |
| `npm run db:migrate:local` | Apply migrations to the local D1 database |
| `npm run db:migrate:remote` | Apply migrations to the remote D1 database |
| `npm run db:migrations:list` | List migrations applied to the remote database |
| `npm run db:generate -- --name=<name>` | Generate a Drizzle SQL draft for a schema change |

## Project structure

```text
app/
  api/auth/    Better Auth catch-all route handler
  dashboard/   Dashboard pages and feature views, including platform-aware routes
  hooks/       Dashboard and order view-model hooks
  lib/         Server-side integrations, D1 access, schema, and platform connectors
  types/       Shared domain types
  utils/       Dashboard, order, and product utilities
auth.ts        Better Auth configuration and session helpers
worker/        Cloudflare Worker entry point
functions/     Standalone workspaces, currently the momo-proxy Cloud Function
migrations/    Cloudflare D1 schema migrations and Drizzle metadata
public/        Static assets
tests/         Vitest and Testing Library tests
drizzle.config.ts  Drizzle Kit schema and migration output paths
vite.config.ts     vinext and Cloudflare Vite configuration
vitest.config.ts   Vitest and jsdom test configuration
wrangler.json      Cloudflare Worker, assets, and D1 bindings
```

`functions/momo-proxy` is an npm workspace that deploys separately as a Google
Cloud Function; it is not part of the Worker bundle.

## Database changes

`app/lib/schema.ts` is the single source of truth for the D1 schema, including
the Better Auth tables. Drizzle Kit writes generated SQL and its metadata
directly to `migrations/`.

### Rebuilding a database from scratch

The current schema is the result of applying every file in `migrations/` in
order, starting from `0000_dapper_layla_miller.sql`.

After deleting and recreating the remote D1 database, apply them all with
Wrangler:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

### Routine schema changes

1. Update `app/lib/schema.ts`.
2. Run `npm run db:generate -- --name=<name>`.
3. Review the generated SQL in `migrations/`.
4. Apply it locally, then remotely:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

Commit each generated SQL migration together with its `migrations/meta/` changes.

## Learn more

- [vinext](https://github.com/cloudflare/vinext)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Better Auth](https://www.better-auth.com/)

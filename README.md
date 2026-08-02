# Chengde Admin

Chengde Admin is an internal administration dashboard built with Next.js, React,
Material UI, and [vinext](https://github.com/cloudflare/vinext). It runs on
Cloudflare Workers, uses D1 for persistence, and authenticates users with Google
through Auth.js.

## Features

- Google sign-in and protected dashboard access
- Dashboard overview and navigation
- Product catalog and inventory management
- Order review and order-merging workflows

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

   Use the generated value for `AUTH_SECRET`. For local authentication, add
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
| `npm run build` | Create a production build |
| `npm run start` | Start the built application |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Check TypeScript types without emitting files |
| `npm run lint` | Run ESLint |
| `npm run db:create` | Create the Cloudflare D1 database |
| `npm run db:migrations:new -- <name>` | Create a new D1 migration |
| `npm run db:migrate:local` | Apply migrations to the local D1 database |
| `npm run db:migrate:remote` | Apply migrations to the remote D1 database |
| `npm run db:migrations:list` | List migrations applied to the remote database |

## Project structure

```text
app/
  dashboard/   Dashboard pages and feature views
  hooks/       Dashboard and order view-model hooks
  lib/         Server-side integrations, including D1 access
  types/       Shared domain types
  utils/       Dashboard, order, and product utilities
migrations/    Cloudflare D1 schema migrations
tests/         Vitest and Testing Library tests
vite.config.ts vinext and Cloudflare Vite configuration
wrangler.json  Cloudflare Worker, assets, and D1 bindings
```

## Database changes

Create schema changes as numbered migration files rather than editing an already
applied migration:

```bash
npm run db:migrations:new -- describe_change
npm run db:migrate:local
```

After verifying the change locally, apply it to the configured remote database
with `npm run db:migrate:remote`.

## Learn more

- [vinext](https://github.com/cloudflare/vinext)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Auth.js](https://authjs.dev/)

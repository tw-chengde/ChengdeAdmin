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
- A Google Cloud project with a fixed outbound IP only when connecting to the
  MOMO platforms through `functions/momo-proxy`

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

   ```powershell
   Copy-Item .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
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

## Environment variables

Copy `.env.example` rather than committing a local environment file. The
application reads these values on the server; browser code must not receive
credentials or proxy tokens.

| Variables | Required when | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Always | Configure Better Auth and Google sign-in |
| `MOMO_PROXY_URL`, `MOMO_PROXY_TOKEN` | Using a fixed-egress proxy | Route both MOMO integrations through the proxy. These two variables must be set together. |
| `MOMO_SCM_ENTP_ID`, `MOMO_SCM_ENTP_CODE`, `MOMO_SCM_ENTP_PASSWORD`, `MOMO_SCM_OTP_BACK_NO` | Using `MOMO_MAIN` | Authenticate requests to momo SCM |
| `MOMO_SCM_THIRD_PARTY_DELIVERY_TYPES`, `MOMO_SCM_THIRD_PARTY_TEMPERATURE_TYPES` | Optional | Override the comma-separated momo SCM delivery defaults in `.env.example` |
| `MO_STORE_PLUS_AUTH_VALUE` | Using `MO_STORE_PLUS` | Set the complete authorization value, normally `Bearer <JWT>` |

MOMO and MO Store Plus both require a registered, fixed outbound IP. In hosted
environments, use the proxy when direct Worker egress does not meet that
requirement. Its proxy token must match `MOMO_PROXY_TOKEN` in the main
application.

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
  actions.ts                     Dashboard sign-out server action
  api/auth/[...all]/route.ts      Better Auth catch-all route handler
  layout.tsx                      Root document layout
  page.tsx                        Login page or redirect to the dashboard
  login-screen.tsx                Login screen client component
  globals.css, theme.ts           Global styles and Material UI theme
  dashboard/
    layout.tsx                    Dashboard layout
    page.tsx                      Redirect from /dashboard to /dashboard/overview
    (platform-aware)/             Authenticated route group; not part of the URL
      layout.tsx                  Session guard and dashboard shell
      overview/, orders/, merge/, settings/
                                 Feature page entry points
    products/page.tsx             Product-management page entry point
    *-actions.ts                  Feature server actions
    *-view.tsx                    Feature view components
    dashboard-shell.tsx           Shared dashboard frame
    dashboard-sidebar.tsx         Navigation sidebar
    nav-items.ts                  Navigation definitions
  hooks/                          Reusable client-side view-model and UI hooks
  lib/
    auth-client.ts                Browser-side Better Auth client
    db.ts                         Typed Drizzle D1 client and binding access
    schema.ts                     D1 schema source of truth
    platforms/
      connector.ts               Platform connector contract
      definitions.ts             Client-safe platform display definitions
      registry.ts                Server-only connector registry
      config.ts                  Platform environment configuration readers
      momo.ts, mo-store-plus.ts  Platform connector implementations
      *-client.ts                External platform API clients
      *-mapper.ts                External API response mappers
      product.ts, sales.ts       Platform product and sales contracts
      platform-http.ts,
      platform-proxy.ts          Shared request and proxy utilities
  types/                          Shared domain types
  utils/                          Stateless domain and presentation utilities
auth.ts                           Better Auth configuration and session helpers
worker/index.ts                   Cloudflare Worker entry point, D1 environment bridge,
                                  image optimization, and App Router delegation
functions/momo-proxy/            Separately deployed Google Cloud Function workspace
  src/index.ts                   Authenticated, allowlisted outbound MOMO proxy
migrations/                       Generated D1 migration SQL and Drizzle metadata
public/                           Static assets
tests/                            Vitest tests; *.test.tsx and use*.test.ts use jsdom
drizzle.config.ts                 Drizzle Kit schema and migration paths
vite.config.ts                    vinext and Cloudflare Vite plugin configuration
vitest.config.ts                  Node and jsdom test project configuration
wrangler.json                    Worker deployment, assets, variables, and D1 binding
```

`definitions.ts` deliberately contains no connector imports or environment
reads, so it is safe for client components. `registry.ts` imports real API
connectors and is server-only. Keep this separation when adding a platform.

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

### MOMO proxy

`functions/momo-proxy` is a standalone Google Cloud Function workspace. Deploy
it independently in an environment with the fixed outbound IP registered with
the platforms. Set `MOMO_PROXY_TOKEN` as a secret there, configure
`PROXY_ALLOWED_TARGET_HOSTS` only if the default MOMO host allowlist must be
changed, and set the resulting HTTPS endpoint as `MOMO_PROXY_URL` in the
Worker. Do not expose the proxy endpoint without its token.

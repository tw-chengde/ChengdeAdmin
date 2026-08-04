import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { getDb } from "@/app/lib/db";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `缺少必要的環境變數 ${name}。請參考 .env.example 設定（本機放 .env / .dev.vars，正式環境用 wrangler secret put）。`,
    );
  }
  return value;
}

function createAuth() {
  return betterAuth({
    baseURL: requireEnv("BETTER_AUTH_URL"),
    // Better Auth detects the raw D1 binding (`batch`/`exec`/`prepare`) and
    // wires up its own D1 dialect — no extra adapter package needed. Tables
    // live in migrations/0002_create_better_auth_tables.sql.
    database: getDb(),
    socialProviders: {
      google: {
        clientId: requireEnv("AUTH_GOOGLE_ID"),
        clientSecret: requireEnv("AUTH_GOOGLE_SECRET"),
      },
    },
    // Required for server actions: `auth.api.*` only collects `Set-Cookie` on
    // an internal response, and this plugin is what forwards those to Next's
    // cookie store. Without it sign-out never clears the session cookie.
    // Must stay last in the array.
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/**
 * Lazy config: on Workers, bindings are only copied into `process.env` (and
 * `globalThis.__CLOUDFLARE_ENV__`) inside the fetch handler (see
 * worker/index.ts), which runs after this module is evaluated. Building the
 * instance on first use defers those reads to request time. Within an isolate
 * `env` is identical across requests, so caching the instance is safe.
 */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}

/**
 * Reads the current Better Auth session from the incoming request cookies.
 * Server-side only (server components / server actions).
 */
export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

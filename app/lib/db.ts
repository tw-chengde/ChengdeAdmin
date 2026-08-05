import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "./schema";

/**
 * Returns the Cloudflare D1 binding for use in server components / server
 * actions. The Worker entry (worker/index.ts) stashes the request `env` on
 * `globalThis` because non-string bindings can't be copied into `process.env`.
 */
export function getD1Database(): D1Database {
  const env = (globalThis as { __CLOUDFLARE_ENV__?: { DB?: D1Database } }).__CLOUDFLARE_ENV__;
  if (!env?.DB) {
    throw new Error(
      "找不到 D1 binding 'DB'。請確認 wrangler.json 已設定 d1_databases，並已套用 migration（npm run db:migrate:local 或 db:migrate:remote）。",
    );
  }
  return env.DB;
}

export type AppDatabase = DrizzleD1Database<typeof schema>;

/**
 * Returns the typed Drizzle client for application data access. The Worker
 * entry stashes its request environment on globalThis because D1 bindings
 * cannot be copied into process.env.
 */
export function getDb(): AppDatabase {
  return drizzle(getD1Database(), { schema });
}

import type { D1Database } from "@cloudflare/workers-types";

/**
 * Returns the Cloudflare D1 binding for use in server components / server
 * actions. The Worker entry (worker/index.ts) stashes the request `env` on
 * `globalThis` because non-string bindings can't be copied into `process.env`.
 */
export function getDb(): D1Database {
  const env = (globalThis as { __CLOUDFLARE_ENV__?: { DB?: D1Database } }).__CLOUDFLARE_ENV__;
  if (!env?.DB) {
    throw new Error(
      "找不到 D1 binding 'DB'。請確認 wrangler.json 已設定 d1_databases，並已套用 migration（npm run db:migrate:local 或 db:migrate:remote）。",
    );
  }
  return env.DB;
}

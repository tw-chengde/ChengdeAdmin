import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "vitest";

const migrationFiles = [
  "0000_dapper_layla_miller.sql",
  "0001_little_thaddeus_ross.sql",
  "0002_heavy_millenium_guard.sql",
  "0003_ambiguous_sunfire.sql",
];

async function createMigratedDatabase() {
  const database = new DatabaseSync(":memory:");
  for (const file of migrationFiles) {
    const source = await readFile(resolve(process.cwd(), "migrations", file), "utf8");
    for (const statement of source.split("--> statement-breakpoint")) {
      if (statement.trim()) database.exec(statement);
    }
  }
  database.exec("PRAGMA foreign_keys = ON");
  return database;
}

test("all D1 migrations apply cleanly and create the expected schema", async () => {
  const database = await createMigratedDatabase();
  try {
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>;
    assert.deepEqual(tables.map((row) => row.name).filter((name) => name !== "sqlite_sequence"), ["account", "platforms", "product_platform_bindings", "products", "session", "user", "verification"]);

    const productColumns = database.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
    assert.deepEqual(productColumns.map((column) => column.name), ["id", "code", "name", "stock", "created_at", "updated_at", "cvs_merge_limit", "logistics_merge_limit"]);
    assert.deepEqual(
      (database.prepare("SELECT code FROM platforms ORDER BY code").all() as Array<{ code: string }>).map((row) => row.code),
      ["MOMO_MAIN", "MO_STORE_PLUS"],
    );
  } finally {
    database.close();
  }
});

test("migration constraints preserve platform binding uniqueness and cascade deletes", async () => {
  const database = await createMigratedDatabase();
  try {
    database.exec("INSERT INTO products (code, name, stock) VALUES ('CD-1001', 'Test product', 1)");
    database.exec("INSERT INTO product_platform_bindings (product_id, platform_code, goods_code) VALUES (1, 'MOMO_MAIN', '1001')");
    assert.throws(
      () => database.exec("INSERT INTO product_platform_bindings (product_id, platform_code, goods_code) VALUES (1, 'MOMO_MAIN', '1001')"),
      /UNIQUE constraint failed/,
    );

    database.exec("DELETE FROM products WHERE id = 1");
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM product_platform_bindings").get() as { count: number }).count, 0);
  } finally {
    database.close();
  }
});
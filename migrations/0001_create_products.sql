-- 商品主檔 (products master table)
-- 因為同一個商品可能在同一個平台上架多次且名稱各異，
-- 這張表是管理者統一管理商品的地方。
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL UNIQUE,          -- 商品代號 (SKU)
  name       TEXT    NOT NULL,                 -- 商品名稱
  stock      INTEGER NOT NULL DEFAULT 0,       -- 庫存
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

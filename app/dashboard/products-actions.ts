"use server";

import { getDb } from "@/app/lib/db";
import type {
  CreateProductInput,
  Product,
  ProductMutationResult,
  UpdateProductInput,
} from "@/app/types/product";
import {
  isValidProductId,
  mapProductDbError,
  notFoundMessage,
  validateProductInput,
} from "@/app/utils/products";

/** 讀取所有商品，最新建立的排在前面。 */
export async function listProducts(): Promise<Product[]> {
  const db = getDb();
  const { results } = await db
    .prepare("SELECT id, code, name, stock, created_at FROM products ORDER BY created_at DESC, id DESC")
    .all<Product>();
  return results ?? [];
}

/** 新增一筆商品。商品代號重複時回傳友善錯誤訊息。 */
export async function createProduct(input: CreateProductInput): Promise<ProductMutationResult> {
  const valid = validateProductInput(input);
  if (!valid.ok) return valid;
  const { code, name, stock } = valid;

  try {
    const db = getDb();
    await db
      .prepare("INSERT INTO products (code, name, stock) VALUES (?, ?, ?)")
      .bind(code, name, stock)
      .run();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mapProductDbError(message, "create", code) };
  }
}

/** 修改既有商品。找不到該筆或商品代號與其他商品重複時回傳友善錯誤訊息。 */
export async function updateProduct(input: UpdateProductInput): Promise<ProductMutationResult> {
  if (!isValidProductId(input.id)) return { ok: false, error: "找不到要修改的商品" };

  const valid = validateProductInput(input);
  if (!valid.ok) return valid;
  const { code, name, stock } = valid;

  try {
    const db = getDb();
    const result = await db
      .prepare("UPDATE products SET code = ?, name = ?, stock = ? WHERE id = ?")
      .bind(code, name, stock, Number(input.id))
      .run();
    if (result.meta?.changes === 0) return { ok: false, error: notFoundMessage("update") };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mapProductDbError(message, "update", code) };
  }
}

/** 刪除商品。找不到該筆時回傳友善錯誤訊息。 */
export async function deleteProduct(id: number): Promise<ProductMutationResult> {
  if (!isValidProductId(id)) return { ok: false, error: "找不到要刪除的商品" };

  try {
    const db = getDb();
    const result = await db.prepare("DELETE FROM products WHERE id = ?").bind(Number(id)).run();
    if (result.meta?.changes === 0) return { ok: false, error: notFoundMessage("delete") };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mapProductDbError(message, "delete") };
  }
}

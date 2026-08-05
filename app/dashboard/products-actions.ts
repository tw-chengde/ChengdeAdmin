"use server";

import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { products } from "@/app/lib/schema";
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
  return db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      stock: products.stock,
      created_at: products.createdAt,
    })
    .from(products)
    .orderBy(desc(products.createdAt), desc(products.id));
}

/** 新增一筆商品。商品代號重複時回傳友善錯誤訊息。 */
export async function createProduct(input: CreateProductInput): Promise<ProductMutationResult> {
  const valid = validateProductInput(input);
  if (!valid.ok) return valid;
  const { code, name, stock } = valid;

  try {
    const db = getDb();
    await db.insert(products).values({ code, name, stock }).run();
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
      .update(products)
      .set({ code, name, stock, updatedAt: sql`datetime('now')` })
      .where(eq(products.id, Number(input.id)))
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
    const result = await db.delete(products).where(eq(products.id, Number(id))).run();
    if (result.meta?.changes === 0) return { ok: false, error: notFoundMessage("delete") };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mapProductDbError(message, "delete") };
  }
}

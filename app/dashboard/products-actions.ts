"use server";

import { getDb } from "@/app/lib/db";

export interface Product {
  id: number;
  code: string;
  name: string;
  stock: number;
  created_at: string;
}

export interface CreateProductInput {
  code: string;
  name: string;
  stock: number;
}

export interface CreateProductResult {
  ok: boolean;
  error?: string;
}

/** 讀取所有商品，最新建立的排在前面。 */
export async function listProducts(): Promise<Product[]> {
  const db = getDb();
  const { results } = await db
    .prepare("SELECT id, code, name, stock, created_at FROM products ORDER BY created_at DESC, id DESC")
    .all<Product>();
  return results ?? [];
}

/** 新增一筆商品。商品代號重複時回傳友善錯誤訊息。 */
export async function createProduct(input: CreateProductInput): Promise<CreateProductResult> {
  const code = input.code?.trim();
  const name = input.name?.trim();
  const stock = Number(input.stock);

  if (!code) return { ok: false, error: "請輸入商品代號" };
  if (!name) return { ok: false, error: "請輸入商品名稱" };
  if (!Number.isInteger(stock) || stock < 0) return { ok: false, error: "庫存必須為 0 或正整數" };

  try {
    const db = getDb();
    await db
      .prepare("INSERT INTO products (code, name, stock) VALUES (?, ?, ?)")
      .bind(code, name, stock)
      .run();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE/i.test(message)) {
      return { ok: false, error: `商品代號「${code}」已存在` };
    }
    return { ok: false, error: "新增失敗，請稍後再試" };
  }
}

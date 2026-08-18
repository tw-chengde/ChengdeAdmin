"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import type { PlatformConnector } from "@/app/lib/platforms/connector";
import type { PlatformProductQuery } from "@/app/lib/platforms/product";
import { getEnabledConnectors } from "@/app/lib/platforms/registry";
import type { PlatformCode } from "@/app/lib/platforms/types";
import { productPlatformBindings } from "@/app/lib/schema";
import type {
  BindProductInput,
  BindingMutationResult,
  MergeBindingPageData,
  ProductBinding,
} from "@/app/types/product-binding";
import { mapBindingDbError, validateBindInput } from "@/app/utils/product-bindings";
import { listEnabledPlatformCodes } from "./platforms-actions";
import { listProducts } from "./products-actions";

/** 讀取所有綁定紀錄，最新建立的排在前面。 */
export async function listProductBindings(): Promise<ProductBinding[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: productPlatformBindings.id,
      product_id: productPlatformBindings.productId,
      platform_code: productPlatformBindings.platformCode,
      goods_code: productPlatformBindings.goodsCode,
      goods_name: productPlatformBindings.goodsName,
      created_at: productPlatformBindings.createdAt,
    })
    .from(productPlatformBindings)
    .orderBy(desc(productPlatformBindings.createdAt), desc(productPlatformBindings.id));
  return rows as ProductBinding[];
}

type PlatformProductsResult = Pick<MergeBindingPageData, "platformProducts" | "failures">;

/**
 * 查詢單一平台的商品。
 *
 * 平台查詢失敗刻意不往外拋：momo 需要 SCM 端的 IP allowlist 或 proxy，設定不全時查詢會失敗，
 * 但綁定關係與本地商品仍應正常顯示，因此改以 failures 帶回、由畫面就地提示。
 */
async function fetchPlatformProducts(connector: PlatformConnector, query: PlatformProductQuery): Promise<PlatformProductsResult> {
  try {
    return { platformProducts: await connector.fetchProducts(query), failures: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { platformProducts: [], failures: [{ platformCode: connector.definition.code, message }] };
  }
}

/**
 * 併單管理頁的資料載入：即時查詢「指定平台」的商品，並帶回綁定關係與本地商品。
 *
 * 只查 query.platformCode 這一個平台 —— 畫面一次也只顯示一個分頁的商品，
 * 併查其他平台只是讓使用者陪跑最慢的那一個。
 *
 * 商品狀態（上架中／已下架）是平台端條件，connector 會轉成自家 API 的參數；
 * 頁面上的關鍵字與綁定狀態則是純前端篩選，不影響這裡的查詢。
 *
 * 平台商品刻意不落 D1，每次載入都是最新狀態。
 */
export async function loadMergeBindingPageData(query: PlatformProductQuery): Promise<MergeBindingPageData> {
  const enabledCodes = await listEnabledPlatformCodes();
  const connector = getEnabledConnectors(enabledCodes).find((item) => item.definition.code === query.platformCode);

  const [result, bindings, products] = await Promise.all([
    connector ? fetchPlatformProducts(connector, query) : Promise.resolve<PlatformProductsResult>({ platformProducts: [], failures: [] }),
    listProductBindings(),
    listProducts(),
  ]);

  return { ...result, bindings, products };
}

/** 建立或變更綁定。同一個平台商品重複綁定時直接覆寫（upsert），不視為錯誤。 */
export async function bindPlatformProduct(input: BindProductInput): Promise<BindingMutationResult> {
  const valid = validateBindInput(input);
  if (!valid.ok) return valid;
  const { productId, platformCode, goodsCode, goodsName } = valid;

  try {
    const db = getDb();
    await db
      .insert(productPlatformBindings)
      .values({ productId, platformCode, goodsCode, goodsName })
      .onConflictDoUpdate({
        target: [productPlatformBindings.platformCode, productPlatformBindings.goodsCode],
        set: { productId, goodsName, updatedAt: sql`datetime('now')` },
      })
      .run();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mapBindingDbError(message, "bind") };
  }
}

/** 解除某個平台商品的綁定。 */
export async function unbindPlatformProduct(platformCode: PlatformCode, goodsCode: string): Promise<BindingMutationResult> {
  const code = goodsCode?.trim();
  if (!platformCode || !code) return { ok: false, error: "缺少要解除綁定的平台商品" };

  try {
    const db = getDb();
    const result = await db
      .delete(productPlatformBindings)
      .where(and(eq(productPlatformBindings.platformCode, platformCode), eq(productPlatformBindings.goodsCode, code)))
      .run();
    if (result.meta?.changes === 0) return { ok: false, error: "找不到這筆綁定，可能已被解除" };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mapBindingDbError(message, "unbind") };
  }
}

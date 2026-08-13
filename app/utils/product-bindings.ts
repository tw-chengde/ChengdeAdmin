import type { PlatformProduct } from "@/app/lib/platforms/product";
import type { Product } from "@/app/types/product";
import type { BindProductInput, ProductBinding } from "@/app/types/product-binding";

export type ValidateBindResult =
  | { ok: true; productId: number; platformCode: string; goodsCode: string; goodsName: string | null }
  | { ok: false; error: string };

/** 驗證綁定輸入並整理值。純函式，供 server action 在碰 D1 之前先擋掉錯誤輸入。 */
export function validateBindInput(input: BindProductInput): ValidateBindResult {
  const productId = Number(input.productId);
  const platformCode = input.platformCode?.trim();
  const goodsCode = input.goodsCode?.trim();
  const goodsName = input.goodsName?.trim();

  if (!Number.isInteger(productId) || productId <= 0) return { ok: false, error: "請選擇要綁定的本地商品" };
  if (!platformCode) return { ok: false, error: "缺少平台代碼" };
  if (!goodsCode) return { ok: false, error: "缺少平台商品編號" };

  return { ok: true, productId, platformCode, goodsCode, goodsName: goodsName || null };
}

/** 本地商品在畫面上的統一標示方式：商品代號 · 商品名稱。 */
export const productLabel = (product: Product) => `${product.code} · ${product.name}`;

/** 綁定的唯一鍵，與 D1 的 (platform_code, goods_code) 唯一索引對應。 */
export function bindingKey(platformCode: string, goodsCode: string): string {
  return `${platformCode}:${goodsCode}`;
}

/** 把綁定清單轉成以 bindingKey 為索引的 Map，避免畫面上每一列都做一次線性搜尋。 */
export function indexBindings(bindings: ProductBinding[]): Map<string, ProductBinding> {
  return new Map(bindings.map((binding) => [bindingKey(binding.platform_code, binding.goods_code), binding]));
}

export type BindingFilter = "ALL" | "BOUND" | "UNBOUND";

export interface PlatformProductCriteria {
  platformCode: string;
  keyword: string;
  filter: BindingFilter;
}

function matchesKeyword(item: PlatformProduct, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  return [item.goodsCode, item.name, item.entpGoodsNo ?? ""].some((field) => field.toLowerCase().includes(needle));
}

/** 依平台分頁、關鍵字與綁定狀態篩選平台商品清單。 */
export function filterPlatformProducts(
  items: PlatformProduct[],
  criteria: PlatformProductCriteria,
  bound: Map<string, ProductBinding>,
): PlatformProduct[] {
  return items.filter((item) => {
    if (item.platformCode !== criteria.platformCode) return false;
    if (!matchesKeyword(item, criteria.keyword)) return false;
    if (criteria.filter === "ALL") return true;
    const isBound = bound.has(bindingKey(item.platformCode, item.goodsCode));
    return criteria.filter === "BOUND" ? isBound : !isBound;
  });
}

/** 單一平台的綁定統計，供頁面上方的統計卡片使用。 */
export function bindingStats(
  items: PlatformProduct[],
  bound: Map<string, ProductBinding>,
): { total: number; bound: number; unbound: number } {
  const total = items.length;
  const boundCount = items.filter((item) => bound.has(bindingKey(item.platformCode, item.goodsCode))).length;
  return { total, bound: boundCount, unbound: total - boundCount };
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 猜測平台商品對應的本地商品：先比對原廠編號，其次比對平台商品編號，
 * 兩者都與本地 products.code 做去空白、不分大小寫的比對。找不到回 null。
 * 上千筆商品逐一手選並不實際，這個預選讓多數情況只需按確認。
 */
export function suggestProductId(item: PlatformProduct, products: Product[]): number | null {
  const candidates = [item.entpGoodsNo, item.goodsCode]
    .map((value) => (value ? normalizeCode(value) : ""))
    .filter((value) => value !== "");

  for (const candidate of candidates) {
    const matched = products.find((product) => normalizeCode(product.code) === candidate);
    if (matched) return matched.id;
  }
  return null;
}

export type BindingAction = "bind" | "unbind";

const fallbackMessage: Record<BindingAction, string> = {
  bind: "綁定失敗，請稍後再試",
  unbind: "解除綁定失敗，請稍後再試",
};

/** 把 D1 的原始錯誤轉成中文訊息，不讓資料庫細節出現在畫面上。 */
export function mapBindingDbError(message: string, action: BindingAction): string {
  if (/FOREIGN KEY/i.test(message)) return "找不到要綁定的本地商品，可能已被刪除";
  return fallbackMessage[action];
}

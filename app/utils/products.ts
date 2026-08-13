import type { CreateProductInput } from "@/app/types/product";

export type ValidateProductResult =
  | {
      ok: true;
      code: string;
      name: string;
      stock: number;
      cvsMergeLimit: number;
      logisticsMergeLimit: number;
    }
  | { ok: false; error: string };

/**
 * 驗證商品欄位並整理值（去除前後空白、數字欄位轉數字）。
 * 純函式，新增與修改共用同一套規則。
 * 併單上限為「同一張併單中此商品最多可出貨的件數」，0 代表不可併單。
 */
export function validateProductInput(input: CreateProductInput): ValidateProductResult {
  const code = input.code?.trim();
  const name = input.name?.trim();
  const stock = Number(input.stock);
  const cvsMergeLimit = Number(input.cvsMergeLimit);
  const logisticsMergeLimit = Number(input.logisticsMergeLimit);

  if (!code) return { ok: false, error: "請輸入商品代號" };
  if (!name) return { ok: false, error: "請輸入商品名稱" };
  if (!Number.isInteger(stock) || stock < 0) return { ok: false, error: "庫存必須為 0 或正整數" };
  if (!Number.isInteger(cvsMergeLimit) || cvsMergeLimit < 0) {
    return { ok: false, error: "超商併單上限必須為 0 或正整數" };
  }
  if (!Number.isInteger(logisticsMergeLimit) || logisticsMergeLimit < 0) {
    return { ok: false, error: "物流併單上限必須為 0 或正整數" };
  }

  return { ok: true, code, name, stock, cvsMergeLimit, logisticsMergeLimit };
}

/** 商品 id 必須是正整數才可能對應到資料庫中的一筆商品。 */
export function isValidProductId(id: unknown): boolean {
  const value = Number(id);
  return Number.isInteger(value) && value > 0;
}

export type ProductAction = "create" | "update" | "delete";

const fallbackMessage: Record<ProductAction, string> = {
  create: "新增失敗，請稍後再試",
  update: "修改失敗，請稍後再試",
  delete: "刪除失敗，請稍後再試",
};

/**
 * 把 D1 丟出的原始錯誤訊息轉成使用者看得懂的中文。
 * 目前只有商品代號的 UNIQUE 限制需要特別說明，其餘一律回傳通用訊息，
 * 避免把資料庫細節洩漏到畫面上。
 */
export function mapProductDbError(message: string, action: ProductAction, code?: string): string {
  if (/UNIQUE/i.test(message) && code) {
    return `商品代號「${code}」已存在`;
  }
  return fallbackMessage[action];
}

/** 找不到目標商品時（UPDATE/DELETE 影響 0 列）顯示的訊息。 */
export function notFoundMessage(action: "update" | "delete"): string {
  return action === "update"
    ? "找不到要修改的商品，可能已被刪除"
    : "找不到要刪除的商品，可能已被刪除";
}

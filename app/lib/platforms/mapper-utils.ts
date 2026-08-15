/**
 * 各平台 mapper 共用的取值工具。
 *
 * 平台 API 回傳的欄位型別都不保證（同一個欄位可能是字串、數字或缺席），
 * 因此這裡統一「取不到就回 null / 0」的規則，各 mapper 不再各自實作一份。
 */

/** 取出去空白後的字串；空字串、非字串一律視為沒有值。 */
export function optionalText(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
}

/** 取出可用的數字；null / undefined / 空字串 / 無法解析一律視為沒有值。 */
export function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 取出數量或金額；缺值與無法解析都當作 0，讓小計運算不會變成 NaN（自動移除千分位逗號）。 */
export function toFiniteNumber(value: unknown): number {
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 把平台回傳的日期字串正規化成 `YYYY-MM-DD`；支援 YYYY/MM/DD、YYYY-MM-DD 與 YYYYMMDD。 */
export function normalizeOrderDate(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }
  const matchCompact = trimmed.match(/^(\d{4})(\d{2})(\d{2})/);
  if (matchCompact) {
    return `${matchCompact[1]}-${matchCompact[2]}-${matchCompact[3]}`;
  }
  return trimmed;
}

/**
 * 依 key 分組，保留第一次出現的順序。
 *
 * 平台的訂單與商品查詢都是「一列一個單品」，同一張訂單／同一個商品會出現多列，
 * 三個 mapper 都需要先分組再彙總。`keyOf` 回傳空值的列會被略過（沒有 key 就無從歸戶）。
 */
export function groupBy<T>(rows: readonly T[], keyOf: (row: T) => string | null | undefined): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  if (!Array.isArray(rows)) return grouped;

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const key = keyOf(row);
    if (!key) continue;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}

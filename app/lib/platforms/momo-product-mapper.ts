import { groupBy, optionalNumber, optionalText } from "./mapper-utils";
import type { MomoGoodsBasicRecord } from "./momo-scm-client";
import type { ListingStatus, PlatformProduct } from "./product";

/** momo 的銷售狀況名稱（SALEGB_NAME）對應到統一的上下架狀態。 */
function listingStatusOf(saleGbName: unknown): ListingStatus | null {
  switch (optionalText(saleGbName)) {
    case "進行":
      return "LISTED";
    case "暫時中斷":
      return "DELISTED";
    default:
      return null;
  }
}

/**
 * momo 的商品簡易查詢一列代表一個單品，同一個 GOODS_CODE 會重複出現。
 * 併單綁定只做到商品層，因此在這裡依 GOODS_CODE 分組並彙總單品資訊。
 */
export function mapMomoGoodsBasicData(rows: MomoGoodsBasicRecord[]): PlatformProduct[] {
  const grouped = groupBy(rows, (row) => optionalText(row.GOODS_CODE));

  return [...grouped.entries()].map(([goodsCode, items]) => {
    const first = items[0];
    // 多規格商品在清單上顯示最低價，與平台後台的呈現一致。
    const prices = items.map((item) => optionalNumber(item.SALE_PRICE)).filter((price): price is number => price !== null);
    return {
      id: `MOMO_MAIN:${goodsCode}`,
      platformCode: "MOMO_MAIN" as const,
      goodsCode,
      name: optionalText(first.GOODS_NAME) ?? goodsCode,
      entpGoodsNo: items.map((item) => optionalText(item.ENTP_GOODS_NO)).find((value) => value !== null) ?? null,
      salePrice: prices.length ? Math.min(...prices) : null,
      listingStatus: listingStatusOf(first.SALEGB_NAME),
      skuCount: items.length,
    };
  });
}

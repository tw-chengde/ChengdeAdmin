import { optionalNumber, optionalText } from "./mapper-utils";
import type { MoStorePlusGoodsRecord } from "./mo-store-plus-client";
import type { ListingStatus, PlatformProduct } from "./product";

/** mo店+ 的 saleStatus 對應到統一的上下架狀態。 */
function listingStatusOf(saleStatus: unknown): ListingStatus | null {
  switch (optionalText(saleStatus)) {
    case "StartSelling":
      return "LISTED";
    case "StopSelling":
      return "DELISTED";
    default:
      return null;
  }
}

/** 把 mo店+ 的商品（含 listGoodsdt 單品陣列）攤平成統一的平台商品模型。 */
export function mapMoStorePlusGoods(records: MoStorePlusGoodsRecord[]): PlatformProduct[] {
  return records
    .map((record): PlatformProduct | null => {
      const goodsCode = optionalText(record.goodsCode);
      if (!goodsCode) return null;
      const details = Array.isArray(record.listGoodsdt) ? record.listGoodsdt : [];

      const prices = [record.salePrice, ...details.map((detail) => detail.salePrice)]
        .map(optionalNumber)
        .filter((price): price is number => price !== null);

      return {
        id: `MO_STORE_PLUS:${goodsCode}`,
        platformCode: "MO_STORE_PLUS" as const,
        goodsCode,
        name: optionalText(record.goodsName) ?? goodsCode,
        entpGoodsNo: details.map((detail) => optionalText(detail.entpGoodsNo)).find((value) => value !== null) ?? null,
        salePrice: prices.length ? Math.min(...prices) : null,
        listingStatus: listingStatusOf(record.saleStatus),
        skuCount: details.length,
      };
    })
    .filter((item): item is PlatformProduct => item !== null);
}

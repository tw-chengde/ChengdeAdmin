import type { ShipRouteId, ShipmentCandidate } from "@/app/types/shipment";
import { normalizeOrderDate, optionalText } from "./mapper-utils";
import { isMoStorePlusFreightItem, type MoStorePlusOrderItemRecord, type MoStorePlusOrderRecord } from "./mo-store-plus-client";
import { mapMoStorePlusOrderItems } from "./mo-store-plus-order-mapper";

/**
 * 依訂單品項判斷出貨路徑。店+ 的 `OrderQuery` 沒有專門的超商品牌欄位，
 * 改用 `listItem[].deliveryCompany` 分辨（目前只會出現「7-11店到店」／「全家店到店」，
 * 已與使用者確認）；第三方物流查詢固定回傳同一個 routeId。
 */
export type MoStorePlusRouteResolver = (firstItem: MoStorePlusOrderItemRecord | undefined) => ShipRouteId | null;

export const resolveStoreRouteByDeliveryCompany: MoStorePlusRouteResolver = (firstItem) => {
  const deliveryCompany = optionalText(firstItem?.deliveryCompany);
  if (deliveryCompany === "7-11店到店") return "MO_STORE_PLUS:STORE:1";
  if (deliveryCompany === "全家店到店") return "MO_STORE_PLUS:STORE:2";
  return null;
};

export function fixedRouteResolver(routeId: ShipRouteId): MoStorePlusRouteResolver {
  return () => routeId;
}

/**
 * 出貨確認用的 `delyGb`（超取路徑限定）。
 *
 * `OrderQuery` 沒有可靠欄位判斷倉到店／店到店方向，因此一律假設倉到店
 * （見 ShipmentCandidate.storeDelyGb 的說明）；全家另需依 `deliveryTemp` 選常溫／冷凍代碼，
 * 未知溫層時預設常溫。
 */
function resolveStoreDelyGb(routeId: ShipRouteId, deliveryTemp: string | null): string | undefined {
  if (routeId === "MO_STORE_PLUS:STORE:1") return "21"; // 7-11 倉到店
  if (routeId === "MO_STORE_PLUS:STORE:2") return deliveryTemp === "冷凍" ? "23" : "27"; // 全家 冷凍/常溫倉到店
  return undefined;
}

/**
 * 把店+ 的訂單（一張訂單一個 `orderNo`，底下 `listItem[]` 為品項）轉成出貨用候選訂單。
 *
 * 修掉既有缺口：`mo-store-plus-order-mapper.ts` 只取 `listItem[0]` 的 `orderSeq`，
 * 出貨時每個品項的 `orderSeq` 都要一併送出，因此這裡收齊全部品項的 `orderSeq`。
 * `resolveRouteId` 回傳 null 的訂單（判斷不出路徑）予以排除，不猜測。
 */
export function mapMoStorePlusShipmentCandidates(
  records: MoStorePlusOrderRecord[],
  resolveRouteId: MoStorePlusRouteResolver,
): ShipmentCandidate[] {
  const candidates: ShipmentCandidate[] = [];

  for (const record of records) {
    const allItems = record.listItem ?? [];
    const items = allItems.filter((item) => !isMoStorePlusFreightItem(item));
    const firstItem = items[0];
    const routeId = resolveRouteId(firstItem);
    if (!routeId) continue;

    const orderNo = optionalText(record.orderNo);
    if (!orderNo) continue;

    const orderItems = mapMoStorePlusOrderItems(items);

    candidates.push({
      id: `MO_STORE_PLUS:${routeId}:${orderNo}`,
      platformCode: "MO_STORE_PLUS",
      routeId,
      orderNo,
      // 出貨時運費品項的 orderSeq 也要一併送出，故用未過濾的 allItems（items 只排除運費用於顯示）。
      orderSeqs: allItems.map((item) => optionalText(item.orderSeq)).filter((seq): seq is string => seq !== null),
      receiverName: String(firstItem?.receiverName ?? firstItem?.customerName ?? ""),
      createdAt: normalizeOrderDate(String(firstItem?.lastProcDate ?? firstItem?.planShipDate ?? "")),
      items: orderItems,
      totalQty: orderItems.reduce((sum, item) => sum + item.qty, 0),
      logistics: String(firstItem?.deliveryCompany ?? firstItem?.deliveryType ?? ""),
      storeDelyGb: resolveStoreDelyGb(routeId, optionalText(firstItem?.deliveryTemp)),
    });
  }

  return candidates;
}

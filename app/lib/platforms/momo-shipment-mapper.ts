import type { ShipRouteId, ShipmentCandidate } from "@/app/types/shipment";
import { groupBy, normalizeOrderDate, optionalText } from "./mapper-utils";
import { mapMomoOrderLineItems } from "./momo-order-mapper";
import type { MomoUnshippedOrder } from "./momo-scm-client";

/**
 * 把 momo SCM 的未出貨訂單列（一列一個平台單品）彙總成出貨用候選訂單。
 *
 * `routeId` 由呼叫端決定（依查詢時打的是超取還是第三方物流查詢），
 * 不從回應欄位反推——momo 的未出貨查詢本身就是依配送類型分開打的。
 */
export function mapMomoShipmentCandidates(
  rows: MomoUnshippedOrder[],
  routeId: ShipRouteId,
  /** 第三方物流查詢已依 delyGb 分開打，這裡原樣標記回候選訂單，供列印時依物流商分組。 */
  thirdPartyDelyGb?: string,
): ShipmentCandidate[] {
  const grouped = groupBy(rows, (row) => row.completeOrderNo);

  return [...grouped.values()].map((items) => {
    const first = items[0]!;
    const orderItems = mapMomoOrderLineItems(items);

    return {
      id: `MOMO_MAIN:${routeId}:${first.completeOrderNo}`,
      platformCode: "MOMO_MAIN",
      routeId,
      orderNo: first.completeOrderNo,
      orderSeqs: [],
      receiverName: first.Receiver || first.receiverMask || "",
      createdAt: normalizeOrderDate(first.lastPricDate),
      items: orderItems,
      totalQty: orderItems.reduce((sum, item) => sum + item.qty, 0),
      logistics: first.orderDelyGbName || first.storeIdName || "",
      custId: optionalText(first.custId) ?? undefined,
      storeIdName: optionalText(first.storeIdName) ?? undefined,
      thirdPartyDelyGb,
    };
  });
}

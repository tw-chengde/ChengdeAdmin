import type { OrderItem } from "@/app/types/order";
import { MOMO_STORE_DELIVERY_TYPE_OPTIONS } from "./definitions";
import { groupBy, normalizeOrderDate, toFiniteNumber } from "./mapper-utils";
import type { MomoOrderGoodsStatisticsRecord, MomoShippingOrder, MomoUnshippedOrder } from "./momo-scm-client";
import type { PlatformSalesStatistics } from "./sales";

/** 超商品牌名稱沿用「超取分類」下拉選單的標籤，兩邊才不會出現兩套超商名稱。 */
const storeBrandByDeliveryType = new Map<string, string>(
  MOMO_STORE_DELIVERY_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

function pickupStore(order: MomoShippingOrder): OrderItem["pickupStore"] {
  const brand = order.storeDeliveryType ? storeBrandByDeliveryType.get(order.storeDeliveryType) : undefined;
  if (!brand) return undefined;

  return {
    brand,
    name: order.storeName || undefined,
    id: order.storeId || undefined,
  };
}

/** Groups momo's one-row-per-order-line payload into the dashboard order model. */
export function mapMomoUnshippedOrders(rows: MomoUnshippedOrder[]): OrderItem[] {
  const grouped = groupBy(rows, (row) => row.completeOrderNo);

  return [...grouped.values()].map((items) => {
    const first = items[0];
    const address = first.receiverAddrMask ?? "";
    const orderItems = items.map((row) => ({
      name: row.goodsName ?? "",
      spec: row.goodsDtInfo ?? "",
      qty: toFiniteNumber(row.syslast),
      price: toFiniteNumber(row.salePrice),
    }));
    return {
      id: `momo:${first.completeOrderNo}`,
      channel: "MOMO 購物網",
      channelCode: "MOMO_MAIN",
      orderNo: first.completeOrderNo,
      customerName: first.Receiver || first.receiverMask || "",
      address,
      items: orderItems,
      totalAmount: orderItems.reduce((total, item) => total + item.qty * item.price, 0),
      // 這批來自 SCM 的「未出貨訂單」查詢（unsendStoresQuery / unsendThirdQuery），
      // 依定義就是尚待出貨的訂單。
      status: "待發貨",
      logistics: first.orderDelyGbName || first.storeIdName || "",
      trackingNo: "",
      createdAt: normalizeOrderDate(first.lastPricDate),
      note: first.scm_msg || first.msg || first.msgNote || undefined,
    };
  });
}

/** Groups momo SCM「出貨中訂單」rows into the dashboard order model. */
export function mapMomoShippingOrders(rows: MomoShippingOrder[]): OrderItem[] {
  const grouped = groupBy(rows, (row) => row.completeOrderNo);

  return [...grouped.values()].map((items) => {
    const first = items[0];
    const store = pickupStore(first);
    const orderItems = items.map((row) => ({
      name: row.goods_name ?? "",
      spec: row.goodsdt_info ?? "",
      qty: toFiniteNumber(row.syslast),
      // 出貨中查詢 API 沒有回傳售價，故不虛構金額。
      price: 0,
    }));
    return {
      id: `momo:${first.completeOrderNo}`,
      channel: "MOMO 購物網",
      channelCode: "MOMO_MAIN",
      orderNo: first.completeOrderNo,
      customerName: first.receiver_mask ?? first.cust_name_mask ?? "",
      address: "",
      items: orderItems,
      totalAmount: 0,
      // 來自「出貨中訂單」查詢（sendingStoresQuery / sendingThirdQuery），momo 把這幾種
      // 細狀態都歸在出貨中，正規化後一律是「配送中」；code_name 是這一列實際的細狀態
      // 名稱（只有這兩支查詢會回傳），另外放 statusDetail 顯示，才不會讓「已印單」的
      // 訂單在畫面上看起來已經在路上。
      status: "配送中",
      statusDetail: first.code_name || undefined,
      logistics: first.dely_gbStr ?? first.storeName ?? store?.brand ?? "",
      trackingNo: first.slip_no ?? "",
      createdAt: normalizeOrderDate(first.create_date),
      pickupStore: store,
      note: first.scm_msg ?? first.msg_note ?? undefined,
    };
  });
}

/**
 * 將 SCM「訂單商品接單統計 (orderGoodsStatisticsQuery)」的商品銷售記錄彙總成銷售統計，
 * 供營運總覽計算查詢區間內的銷售總金額與成交量。
 *
 * 三個來自 API 本身的限制，不是這裡可以補的：
 * 1. 回應是商品層級的加總，沒有訂單的概念，所以 `orderCount` 是件數而非訂單張數。
 * 2. 回應沒有任何日期欄位，因此 `daily` 一律留空——這批資料無法貢獻每日走勢。
 *    區間總額仍然正確，因為查詢時已用 stDate／edDate 圈定範圍。
 * 3. 回應沒有售價，只有 buyPrice（進價含稅），所以金額是以進價估算的。
 */
export function mapMomoSalesStatistics(rows: MomoOrderGoodsStatisticsRecord[]): PlatformSalesStatistics {
  let revenue = 0;
  let orderCount = 0;
  let returnCount = 0;

  for (const row of rows) {
    // claimQty（客退數量）是這支 API 唯一的退貨訊號，全退的商品也要算進去。
    const claimQty = Math.max(toFiniteNumber(row.claimQty), 0);
    returnCount += claimQty;

    // orderQty 已是「訂購-取消」的淨量，再扣掉客退數量才是實際成交量。
    const netQty = toFiniteNumber(row.orderQty) - claimQty;
    if (netQty <= 0) continue;

    revenue += netQty * toFiniteNumber(row.buyPrice);
    orderCount += netQty;
  }

  return { revenue, orderCount, returnCount, daily: [] };
}

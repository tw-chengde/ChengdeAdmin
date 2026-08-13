import type { OrderItem, OrderStatus } from "@/app/types/order";
import { normalizeOrderDate, optionalText, toFiniteNumber } from "./mapper-utils";
import type { MoStorePlusOrderRecord } from "./mo-store-plus-client";

/**
 * mo店+ 的訂單狀態對應到統一的訂單狀態。
 *
 * 訂單查詢的 `orderStatus` 是英文篩選條件，但實際回應的 `itemStatus` 是中文狀態文字。
 * 因此這份表以回應值為主；英文條件值保留為相容的 fallback，避免日後 API 回傳格式改變時
 * 讓既有訂單全數落入「其他」。
 * 平台的狀態比畫面上的分類細，多個平台狀態會收斂到同一個統一狀態：
 * 「未出貨」與「已印單」都還沒交運，因此都算待發貨；「未回收」與「回收確認」屬於退貨流程；
 * 「配送異常」仍在配送途中，只是需要人工處理，故歸為配送中。
 */
const statusByMoStorePlusStatus: Record<string, OrderStatus> = {
  // OrderQuery 實際回傳的 listItem[].itemStatus。
  "訂單接獲(未付款)": "待付款",
  "出貨通知(已付款)": "待發貨",
  "出貨確認": "配送中",
  "配送結束": "已完成",
  "回收確認": "退貨申請",
  "客戶取消": "已取消",

  // OrderQuery 的 orderStatus 篩選值；目前不是實際回傳的 itemStatus。
  Unpaid: "待付款",
  NotShipped: "待發貨",
  Printed: "待發貨",
  Shipping: "配送中",
  AbnormalDelivery: "配送中",
  DoneDelivery: "已完成",
  OrderCancelled: "已取消",
  ReturnCancelled: "已取消",
  NotRecycled: "退貨申請",
  RecycleConfirmed: "退貨申請",
};

/**
 * 認不出的狀態一律落到「其他」，不猜測。
 * 猜錯會直接反映在「待處理出貨」的數字上，比顯示成未知狀態更難察覺。
 */
export function toMoStorePlusOrderStatus(raw: unknown): OrderStatus {
  const value = optionalText(raw);
  if (!value) return "其他";
  return statusByMoStorePlusStatus[value] ?? "其他";
}

export function mapMoStorePlusOrders(records: MoStorePlusOrderRecord[]): OrderItem[] {
  return records.map((record, index) => {
    const address = String(record.address ?? record.receiverAddress ?? "");
    const items = (record.items ?? []).map((item) => ({
      name: item.name ?? item.productName ?? "",
      spec: item.spec ?? "",
      qty: toFiniteNumber(item.quantity ?? item.qty),
      price: toFiniteNumber(item.price),
    }));
    const orderItems = items.length
      ? items
      : (record.listItem ?? []).map((item) => ({
          name: item.goodsName ?? "",
          spec: [item.goodsInfo1, item.goodsInfo2].filter(Boolean).join(" / "),
          qty: toFiniteNumber(item.quantity),
          price: toFiniteNumber(item.orderAmount),
        }));
    const firstItem = record.listItem?.[0];
    const orderNo = String(record.orderNo ?? record.order_no ?? record.id ?? index);
    return {
      id: `mo-store-plus:${orderNo}`,
      channel: "Mo 店+",
      channelCode: "MO_STORE_PLUS",
      orderNo,
      customerName: String(record.customerName ?? record.customer_name ?? ""),
      address,
      items: orderItems,
      totalAmount: toFiniteNumber(record.totalAmount ?? record.total_amount) || orderItems.reduce((sum, item) => sum + item.qty * item.price, 0),
      status: toMoStorePlusOrderStatus(record.status ?? firstItem?.itemStatus),
      logistics: String(record.logistics ?? firstItem?.deliveryCompany ?? firstItem?.deliveryType ?? ""),
      trackingNo: String(record.trackingNo ?? record.tracking_no ?? firstItem?.deliveryNo ?? ""),
      // 與 momo 一致正規化成 YYYY-MM-DD。訂單日期在別處是以字串比較的，
      // 混進 `2026/08/12` 這種格式會比出錯誤的結果。
      createdAt: normalizeOrderDate(
        String(record.createdAt ?? record.created_at ?? firstItem?.lastProcDate ?? firstItem?.planShipDate ?? ""),
      ),
    };
  });
}

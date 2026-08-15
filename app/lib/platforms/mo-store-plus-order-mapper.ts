import type { OrderItem, OrderStatus } from "@/app/types/order";
import { normalizeOrderDate, optionalText, toFiniteNumber } from "./mapper-utils";
import type { MoStorePlusOrderItemRecord, MoStorePlusOrderRecord } from "./mo-store-plus-client";

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

/**
 * 一張訂單的狀態取「進度最落後」的品項。
 *
 * OrderQuery 沒有訂單層的狀態，只有每個品項的 itemStatus，而同一張訂單的品項可以
 * 分批出貨或部分取消。取第一個品項會讓「已出貨一半」的訂單看起來整張都出完了，
 * 因此改取最落後的那個——整張訂單要到最後一個品項完成才算完成。
 * 已取消／退貨排在正常流程之後，部分取消的訂單才不會被整張標成已取消。
 */
const statusRank: Record<OrderStatus, number> = {
  待付款: 0,
  待發貨: 1,
  配送中: 2,
  已完成: 3,
  退貨申請: 4,
  已取消: 5,
  其他: 6,
};

function orderStatusOf(items: MoStorePlusOrderItemRecord[]): OrderStatus {
  if (!items.length) return "其他";
  return items
    .map((item) => toMoStorePlusOrderStatus(item.itemStatus))
    .reduce((slowest, status) => (statusRank[status] < statusRank[slowest] ? status : slowest));
}

export function mapMoStorePlusOrders(records: MoStorePlusOrderRecord[]): OrderItem[] {
  return records.map((record, index) => {
    const items = record.listItem ?? [];
    const firstItem = items[0];
    const orderItems = items.map((item) => {
      const qty = toFiniteNumber(item.quantity);
      // orderAmount 規格上是「訂單金額」＝該品項的小計，不是單價。
      // 統一模型的 price 是單價，因此在這裡還原，避免小計被數量再乘一次。
      const amount = toFiniteNumber(item.orderAmount);
      return {
        name: item.goodsName ?? "",
        spec: [item.goodsInfo1, item.goodsInfo2].filter(Boolean).join(" / "),
        qty,
        price: qty > 0 ? amount / qty : amount,
      };
    });
    const orderNo = String(record.orderNo ?? index);
    return {
      id: `mo-store-plus:${orderNo}`,
      channel: "Mo 店+",
      channelCode: "MO_STORE_PLUS",
      orderNo,
      // 訂單層沒有任何收件人／金額／日期欄位，全部只能從品項層取。
      customerName: String(firstItem?.customerName ?? firstItem?.receiverName ?? ""),
      address: String(firstItem?.receiverAddress ?? ""),
      items: orderItems,
      totalAmount: items.reduce((sum, item) => sum + toFiniteNumber(item.orderAmount), 0),
      status: orderStatusOf(items),
      logistics: String(firstItem?.deliveryCompany ?? firstItem?.deliveryType ?? ""),
      trackingNo: String(firstItem?.deliveryNo ?? ""),
      // 與 momo 一致正規化成 YYYY-MM-DD。訂單日期在別處是以字串比較的，
      // 混進 `2026/08/12` 這種格式會比出錯誤的結果。
      createdAt: normalizeOrderDate(String(firstItem?.lastProcDate ?? firstItem?.planShipDate ?? "")),
    };
  });
}

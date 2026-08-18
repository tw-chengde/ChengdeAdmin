import type { OrderItem, OrderLineItem, OrderStatus } from "@/app/types/order";
import { normalizeOrderDate, optionalText, toFiniteNumber } from "./mapper-utils";
import { isMoStorePlusFreightItem, type MoStorePlusOrderItemRecord, type MoStorePlusOrderRecord } from "./mo-store-plus-client";

/**
 * listItem 品項轉成統一的訂單品項格式。訂單查詢與出貨候選訂單（見 mo-store-plus-shipment-mapper.ts）
 * 都是把同一份 `listItem` 轉成這個形狀，因此抽成共用函式，兩邊才不會各自維護一份容易分岔的邏輯。
 */
export function mapMoStorePlusOrderItems(items: readonly MoStorePlusOrderItemRecord[]): OrderLineItem[] {
  return items.map((item) => {
    const qty = toFiniteNumber(item.quantity);
    // orderAmount 規格上是「訂單金額」＝該品項的小計，不是單價。
    // 統一模型的 price 是單價，因此在這裡還原，避免小計被數量再乘一次。
    const amount = toFiniteNumber(item.orderAmount);
    return {
      name: item.goodsName ?? "",
      spec: [item.goodsInfo1, item.goodsInfo2].filter(Boolean).join(" / "),
      qty,
      price: qty > 0 ? amount / qty : amount,
      // 注意：訂單查詢（此處）用 goodsNo；商品查詢（GoodsQueryByMethod）用 goodsCode。
      goodsCode: optionalText(item.goodsNo) ?? undefined,
      goodsdtCode: optionalText(item.goodsdtCode) ?? undefined,
      entpGoodsNo: optionalText(item.entpGoodsNo) ?? undefined,
    };
  });
}

/**
 * mo店+ 的訂單狀態對應到統一的訂單狀態。
 *
 * OrderQuery 實際回應的 `itemStatus` 為中文狀態文字，因此這份表以回應值為主；
 * 英文條件值保留為相容的 fallback，避免日後 API 回傳格式改變時讓既有訂單全數落入「其他」。
 */
const statusByMoStorePlusStatus: Record<string, OrderStatus> = {
  // OrderQuery 實際回傳的 listItem[].itemStatus。
  "訂單接獲(未付款)": "待付款",
  "出貨通知(已付款)": "待發貨",
  "已印單": "已印單",
  "出貨確認": "配送中",
  "配送結束": "已完成",
  "回收確認": "退貨申請",
  "客戶取消": "已取消",

  // OrderQuery 的 orderStatus 篩選值；目前不是實際回傳的 itemStatus。
  Unpaid: "待付款",
  NotShipped: "待發貨",
  Printed: "已印單",
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
  已印單: 2,
  配送中: 3,
  已完成: 4,
  退貨申請: 5,
  已取消: 6,
  其他: 7,
};

function orderStatusOf(items: MoStorePlusOrderItemRecord[]): OrderStatus {
  if (!items.length) return "其他";
  return items
    .map((item) => toMoStorePlusOrderStatus(item.itemStatus))
    .reduce((slowest, status) => (statusRank[status] < statusRank[slowest] ? status : slowest));
}

export function mapMoStorePlusOrders(records: MoStorePlusOrderRecord[]): OrderItem[] {
  return records.map((record, index) => {
    const allItems = record.listItem ?? [];
    const items = allItems.filter((item) => !isMoStorePlusFreightItem(item));
    // 訂單若只剩運費品項（實體商品已被平台移除），仍要能取得收件人／狀態，故 fallback 回未過濾清單。
    const firstItem = items[0] ?? allItems[0];
    const orderItems = mapMoStorePlusOrderItems(items);
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
      // 訂單總額含運費：items 排除運費品項只是為了不讓它出現在揀貨/品項清單裡，
      // totalAmount 仍要用未過濾的 allItems，否則會少算運費。
      totalAmount: allItems.reduce((sum, item) => sum + toFiniteNumber(item.orderAmount), 0),
      status: orderStatusOf(items),
      logistics: String(firstItem?.deliveryCompany ?? firstItem?.deliveryType ?? ""),
      trackingNo: String(firstItem?.deliveryNo ?? ""),
      // 與 momo 一致正規化成 YYYY-MM-DD。訂單日期在別處是以字串比較的，
      // 混進 `2026/08/12` 這種格式會比出錯誤的結果。
      createdAt: normalizeOrderDate(String(firstItem?.lastProcDate ?? firstItem?.planShipDate ?? "")),
    };
  });
}

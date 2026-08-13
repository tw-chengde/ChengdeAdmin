import type { OrderItem } from "@/app/types/order";
import { groupBy, normalizeOrderDate, toFiniteNumber } from "./mapper-utils";
import type { MomoShippingOrder, MomoUnshippedOrder } from "./momo-scm-client";

const storeBrandByDeliveryType: Record<NonNullable<MomoShippingOrder["storeDeliveryType"]>, string> = {
  "21": "7-11",
  "27": "全家",
  "28": "7-11 店到店",
  "29": "全家 店到店",
  "2A": "OK mart",
  "2B": "萊爾富",
};

function pickupStore(order: MomoShippingOrder): OrderItem["pickupStore"] {
  const brand = order.storeDeliveryType ? storeBrandByDeliveryType[order.storeDeliveryType] : undefined;
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
      // 來自「出貨中訂單」查詢（sendingStoresQuery / sendingThirdQuery）。
      status: "配送中",
      logistics: first.dely_gbStr ?? first.storeName ?? store?.brand ?? "",
      trackingNo: first.slip_no ?? "",
      createdAt: normalizeOrderDate(first.create_date),
      pickupStore: store,
      note: first.scm_msg ?? first.msg_note ?? undefined,
    };
  });
}

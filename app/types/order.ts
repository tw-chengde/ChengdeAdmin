import type { PlatformCode } from "@/app/lib/platforms/types";

/**
 * 各平台原始狀態正規化後的訂單狀態。
 *
 * 「其他」是給認不出的平台狀態用的出口：各平台隨時可能回傳文件沒寫的值，
 * 硬塞成其中一個具體狀態會讓統計數字說謊（例如把未知狀態算進「待處理出貨」）。
 * 落到「其他」的訂單在畫面上以中性樣式呈現，且不計入任何統計。
 */
export type OrderStatus = "待付款" | "待發貨" | "已印單" | "配送中" | "已完成" | "已取消" | "退貨申請" | "其他";

/** 尚未完成出貨、仍應納入揀貨與待出貨統計的訂單狀態。 */
export function isPendingShipmentStatus(status: OrderStatus): boolean {
  return status === "待發貨" || status === "已印單";
}

export interface OrderLineItem {
  name: string;
  spec: string;
  qty: number;
  price: number;
  /** 平台商品編號（momo: goodsCode／店+: goodsNo）。對應 product_platform_bindings.goods_code。 */
  goodsCode?: string;
  /** 單品（規格）編號（momo: goodsDtCode／店+: goodsdtCode）。揀貨單的彙總鍵。 */
  goodsdtCode?: string;
  /** 商品原廠編號。未綁定時可用來猜本地商品。 */
  entpGoodsNo?: string;
}

export interface OrderItem {
  id: string;
  channel: string;
  channelCode: PlatformCode;
  orderNo: string;
  customerName: string;
  address: string;
  items: OrderLineItem[];
  totalAmount: number;
  status: OrderStatus;
  /**
   * 可選：平台原始的細狀態文字（例如 momo 出貨中的「已印單」「待客戶取件」）。
   *
   * `status` 是跨平台正規化後的狀態，多個平台細狀態會併成同一個值；
   * 細狀態放這裡另外顯示，畫面才不會把「已印單」和「配送中」講成同一件事。
   */
  statusDetail?: string;
  logistics: string;
  trackingNo: string;
  createdAt: string;
  pickupStore?: {
    brand: string;
    name?: string;
    id?: string;
  };
  note?: string;
}

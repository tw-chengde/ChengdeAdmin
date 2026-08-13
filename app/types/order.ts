import type { PlatformCode } from "@/app/lib/platforms/types";

/**
 * 各平台原始狀態正規化後的訂單狀態。
 *
 * 「其他」是給認不出的平台狀態用的出口：各平台隨時可能回傳文件沒寫的值，
 * 硬塞成其中一個具體狀態會讓統計數字說謊（例如把未知狀態算進「待處理出貨」）。
 * 落到「其他」的訂單在畫面上以中性樣式呈現，且不計入任何統計。
 */
export type OrderStatus = "待付款" | "待發貨" | "配送中" | "已完成" | "已取消" | "退貨申請" | "其他";

export interface OrderItem {
  id: string;
  channel: string;
  channelCode: PlatformCode;
  orderNo: string;
  channelOrderNo: string;
  customerName: string;
  address: string;
  items: { name: string; spec: string; qty: number; price: number }[];
  totalAmount: number;
  status: OrderStatus;
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

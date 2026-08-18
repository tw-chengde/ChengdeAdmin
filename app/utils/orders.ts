import { getAllPlatformDefinitions } from "@/app/lib/platforms/definitions";
import type { PlatformCode } from "@/app/lib/platforms/types";
import { isPendingShipmentStatus, type OrderItem } from "@/app/types/order";

export type ChannelTab = PlatformCode | null;

export interface OrderDateRange {
  /** `YYYY-MM-DD` */
  startDate: string;
  /** `YYYY-MM-DD` */
  endDate: string;
}

/**
 * 起迄日期的最大區間。前端用它限制日期選擇器可選的範圍，
 * 後端用它擋掉直接呼叫 server action 的請求——兩邊必須是同一個數字，
 * 否則使用者選得到卻查不動。
 */
export const MAX_DATE_RANGE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 預設查詢區間：今天往前推 7 天（含今天）。 */
export function getDefaultDateRange(): OrderDateRange {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

/** 給定開始日期時，結束日期最遠可以選到哪一天。 */
export function getMaxEndDate(startDate: string): string {
  const maxEnd = new Date(`${startDate}T00:00:00+08:00`);
  maxEnd.setDate(maxEnd.getDate() + MAX_DATE_RANGE_DAYS);
  return formatDate(maxEnd);
}

function parseTaipeiDate(value: string, endOfDay: boolean): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date format");
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }
  return date;
}

/**
 * 把畫面上的起迄日期字串換算成台北時區的查詢區間，並驗證格式與長度。
 *
 * 純函式，抽出 server action 之外才測得到——`"use server"` 模組的匯出必須全是
 * async server function，非同步以外的東西只能是模組私有。
 */
export function resolveOrderDateRange({ startDate, endDate }: OrderDateRange): { from: Date; to: Date } {
  const from = parseTaipeiDate(startDate, false);
  const to = parseTaipeiDate(endDate, true);
  if (from > to) {
    throw new Error("Start date cannot be after end date");
  }

  // 以兩邊的當日零時相減，才不會被 to 的 23:59:59.999 影響天數。
  const days = Math.round((parseTaipeiDate(endDate, false).getTime() - from.getTime()) / MS_PER_DAY);
  if (days > MAX_DATE_RANGE_DAYS) {
    throw new Error(`起迄日期最大區間為 ${MAX_DATE_RANGE_DAYS} 天`);
  }
  return { from, to };
}

export interface OrderFilterCriteria {
  channelTab: ChannelTab;
  searchQuery: string;
}

function matchesKeyword(order: OrderItem, keyword: string): boolean {
  // 需與呼叫端一致取 trim 後的值，否則貼上帶空白的訂單編號會搜不到。
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;

  return (
    order.orderNo.toLowerCase().includes(needle) ||
    order.customerName.toLowerCase().includes(needle) ||
    order.items.some((item) => item.name.toLowerCase().includes(needle))
  );
}

/**
 * 依通路與關鍵字篩選訂單。純函式，供 view model 與測試共用。
 *
 * 這裡刻意不再篩日期：起迄日期是查詢條件，已經送進各平台 API 由平台端篩選。
 * 前端再篩一次不但多餘，還會因為各平台回傳的日期格式不一而誤刪資料。
 */
export function filterOrders(orders: OrderItem[], criteria: OrderFilterCriteria): OrderItem[] {
  return orders.filter((order) => {
    if (order.channelCode !== criteria.channelTab) return false;
    return matchesKeyword(order, criteria.searchQuery);
  });
}

export interface OrderStats {
  totalOrders: number;
  pendingShipment: number;
  rmaCount: number;
}

/** 統計卡片的數字。只看通路篩選，不受關鍵字影響。 */
export function orderStats(orders: OrderItem[], channelTab: ChannelTab): OrderStats {
  const scoped = orders.filter((order) => order.channelCode === channelTab);

  return {
    totalOrders: scoped.length,
    pendingShipment: scoped.filter((order) => isPendingShipmentStatus(order.status)).length,
    rmaCount: scoped.filter((order) => order.status === "退貨申請" || order.status === "已取消").length,
  };
}

export function statusStyle(status: OrderItem["status"]) {
  switch (status) {
    case "待發貨":
      return { color: "#b54708", bgcolor: "#fffaeb", border: "1px solid #fedf89" };
    case "已印單":
      return { color: "#6941c6", bgcolor: "#f9f5ff", border: "1px solid #d9d6fe" };
    case "配送中":
      return { color: "#175cd3", bgcolor: "#eff8ff", border: "1px solid #b2ddff" };
    case "已完成":
      return { color: "#027a48", bgcolor: "#ecfdf3", border: "1px solid #abefc6" };
    case "待付款":
      return { color: "#c01048", bgcolor: "#fff1f3", border: "1px solid #fecdca" };
    case "退貨申請":
      return { color: "#b42318", bgcolor: "#fef3f2", border: "1px solid #fecdca" };
    case "已取消":
    // 「其他」是認不出的平台狀態，與已取消共用中性樣式，不強調也不誤導。
    case "其他":
      return { color: "#344054", bgcolor: "#f2f4f7", border: "1px solid #eaecf0" };
    default:
      return { color: "#344054", bgcolor: "#f2f4f7", border: "1px solid #eaecf0" };
  }
}

export function channelStyle(channelCode: OrderItem["channelCode"]) {
  const def = getAllPlatformDefinitions().find((d) => d.code === channelCode);
  if (!def) {
    return {
      name: channelCode,
      color: "#344054",
      bgcolor: "#f2f4f7",
      borderColor: "#eaecf0",
      gradient: "linear-gradient(135deg, #64748b, #475569)",
    };
  }
  return {
    name: def.name,
    color: def.color,
    bgcolor: def.bgcolor,
    borderColor: def.borderColor,
    gradient: def.gradient,
  };
}

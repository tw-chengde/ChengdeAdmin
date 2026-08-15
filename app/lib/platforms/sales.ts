import type { OrderItem } from "@/app/types/order";

/** 營運總覽的期間查詢；與訂單頁的逐筆查詢不同，這裡只需要日期區間。 */
export interface PlatformSalesQuery {
  from: Date;
  to: Date;
}

/** 期間內某一天的銷售彙總。 */
export interface PlatformDailySales {
  /** 台北時區日期，格式 YYYY-MM-DD。 */
  date: string;
  revenue: number;
  orderCount: number;
}

/**
 * 單一平台在查詢區間內的銷售彙總。
 *
 * 刻意不回傳逐筆訂單：momo SCM 的接單統計 API 只給商品層級的加總，
 * 硬包成 OrderItem 就得編造訂單編號、收件人與日期，那些假資料會一路流進統計。
 */
export interface PlatformSalesStatistics {
  /** 區間內的成交金額。 */
  revenue: number;
  /**
   * 區間內的成交量。單位由各平台依自身能取得的口徑決定——
   * mo店+ 是訂單張數，momo 的統計 API 只到商品層級，因此是件數。
   */
  orderCount: number;
  /** 區間內的退貨／取消數。 */
  returnCount: number;
  /**
   * 逐日銷售，依日期由小到大排列。
   * 平台若無法提供日期（momo 的接單統計就是如此）則為空陣列，
   * 總覽會據此標示走勢圖未涵蓋該平台，而不是讓它默默地少一塊。
   */
  daily: PlatformDailySales[];
}

export function emptySalesStatistics(): PlatformSalesStatistics {
  return { revenue: 0, orderCount: 0, returnCount: 0, daily: [] };
}

const returnedStatuses: ReadonlySet<OrderItem["status"]> = new Set(["退貨申請", "已取消"]);

/**
 * 平台若查得到逐筆訂單，銷售統計就是這些訂單的彙總；各平台共用同一套口徑。
 *
 * 沒有日期的訂單仍計入區間總額（查詢時已用日期圈定範圍），只是進不了逐日走勢。
 */
export function summarizeOrders(orders: OrderItem[]): PlatformSalesStatistics {
  const dailyByDate = new Map<string, PlatformDailySales>();
  let revenue = 0;
  let returnCount = 0;

  for (const order of orders) {
    revenue += order.totalAmount;
    if (returnedStatuses.has(order.status)) returnCount += 1;

    const date = order.createdAt.slice(0, 10);
    if (!date) continue;
    const day = dailyByDate.get(date) ?? { date, revenue: 0, orderCount: 0 };
    day.revenue += order.totalAmount;
    day.orderCount += 1;
    dailyByDate.set(date, day);
  }

  return {
    revenue,
    orderCount: orders.length,
    returnCount,
    daily: [...dailyByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

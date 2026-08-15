import type { PlatformDefinition } from "@/app/lib/platforms/types";
import type { OrderItem } from "@/app/types/order";

export interface OverviewDateRange {
  startDate: string;
  endDate: string;
  from: Date;
  to: Date;
}

export interface OverviewDateRanges {
  currentMonth: OverviewDateRange;
  lastMonth: OverviewDateRange;
  lastMonthSamePeriod: OverviewDateRange;
  currentYear: number;
  currentMonthNumber: number;
  lastMonthNumber: number;
  todayDay: number;
}

export interface PlatformOverviewStat {
  code: string;
  name: string;
  logo: string;
  logoObjectFit: "contain" | "cover";
  color: string;
  bgcolor: string;
  borderColor: string;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  currentMonthOrders: number;
  lastMonthOrders: number;
  currentMonthAov: number;
  lastMonthAov: number;
  sharePercentage: number;
  pendingShipment: number;
}

export interface DailySalesTrendItem {
  date: string;
  label: string;
  day: number;
  revenue: number;
  orderCount: number;
  cumulativeRevenue: number;
}

export interface OverviewMetrics {
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  lastMonthSamePeriodRevenue: number;
  currentMonthOrders: number;
  lastMonthOrders: number;
  currentMonthAov: number;
  lastMonthAov: number;
  revenueGrowthRate: number | null;
  ordersGrowthRate: number | null;
  pendingShipments: number;
  rmaCount: number;
  platformStats: PlatformOverviewStat[];
  dailyTrends: DailySalesTrendItem[];
  currentMonthLabel: string;
  lastMonthLabel: string;
}

function parseTaipeiDate(value: string, endOfDay: boolean): Date {
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`);
}

function getTaipeiParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  return {
    year: Number.parseInt(parts.year ?? "2026", 10),
    month: Number.parseInt(parts.month ?? "1", 10),
    day: Number.parseInt(parts.day ?? "1", 10),
  };
}

/**
 * 計算台北時區的當月迄今（MTD）、上月整月與上月同期的起迄區間。
 */
export function getOverviewDateRanges(referenceDate = new Date()): OverviewDateRanges {
  const { year, month, day } = getTaipeiParts(referenceDate);

  // 當月區間：1 號至今日
  const currentMonthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const currentMonthEndStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // 上月年月與天數計算
  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;
  const daysInLastMonth = new Date(Date.UTC(lastMonthYear, lastMonth, 0)).getUTCDate();

  // 上月整月區建
  const lastMonthStartStr = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-01`;
  const lastMonthEndStr = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-${String(daysInLastMonth).padStart(2, "0")}`;

  // 上月同期區間（1 號至 min(今日日數, 上月總天數)）
  const sameDayInLastMonth = Math.min(day, daysInLastMonth);
  const lastMonthSamePeriodEndStr = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-${String(sameDayInLastMonth).padStart(2, "0")}`;

  return {
    currentMonth: {
      startDate: currentMonthStartStr,
      endDate: currentMonthEndStr,
      from: parseTaipeiDate(currentMonthStartStr, false),
      to: parseTaipeiDate(currentMonthEndStr, true),
    },
    lastMonth: {
      startDate: lastMonthStartStr,
      endDate: lastMonthEndStr,
      from: parseTaipeiDate(lastMonthStartStr, false),
      to: parseTaipeiDate(lastMonthEndStr, true),
    },
    lastMonthSamePeriod: {
      startDate: lastMonthStartStr,
      endDate: lastMonthSamePeriodEndStr,
      from: parseTaipeiDate(lastMonthStartStr, false),
      to: parseTaipeiDate(lastMonthSamePeriodEndStr, true),
    },
    currentYear: year,
    currentMonthNumber: month,
    lastMonthNumber: lastMonth,
    todayDay: day,
  };
}

function extractDatePrefix(createdAt: string): string {
  const match = createdAt.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : createdAt.slice(0, 10);
}

function countEffectiveOrders(orders: OrderItem[]): number {
  return orders.reduce((sum, order) => {
    if (order.channelCode === "MOMO_MAIN") {
      const itemsQty = order.items.reduce((s, it) => s + (it.qty > 0 ? it.qty : 0), 0);
      return sum + (itemsQty > 0 ? itemsQty : 1);
    }
    return sum + 1;
  }, 0);
}

/**
 * 計算跨平台加總總覽指標與每日趨勢。純函式，方便測試與共用。
 */
export function calculateOverviewMetrics(
  currentMonthOrders: OrderItem[],
  lastMonthOrders: OrderItem[],
  platforms: PlatformDefinition[],
  dateRanges: OverviewDateRanges = getOverviewDateRanges(),
  explicitLastMonthSamePeriodOrders?: OrderItem[],
): OverviewMetrics {
  const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  // 上月同期業績：若有獨立查詢傳入則直接使用，否則從上月全月訂單依日期篩選
  const lastMonthSamePeriodMaxDate = dateRanges.lastMonthSamePeriod.endDate;
  const lastMonthSamePeriodOrders =
    explicitLastMonthSamePeriodOrders ??
    lastMonthOrders.filter((order) => {
      const orderDate = extractDatePrefix(order.createdAt);
      return orderDate ? orderDate <= lastMonthSamePeriodMaxDate : false;
    });
  const lastMonthSamePeriodRevenue = lastMonthSamePeriodOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  const currentMonthOrdersCount = countEffectiveOrders(currentMonthOrders);
  const lastMonthOrdersCount = countEffectiveOrders(lastMonthOrders);
  const lastMonthSamePeriodOrdersCount = countEffectiveOrders(lastMonthSamePeriodOrders);

  const currentMonthAov = currentMonthOrdersCount > 0 ? Math.round(currentMonthRevenue / currentMonthOrdersCount) : 0;
  const lastMonthAov = lastMonthOrdersCount > 0 ? Math.round(lastMonthRevenue / lastMonthOrdersCount) : 0;

  // 與上月同期相比的成長率；若上月同期無營收則回傳 null
  const revenueGrowthRate =
    lastMonthSamePeriodRevenue > 0
      ? Math.round(((currentMonthRevenue - lastMonthSamePeriodRevenue) / lastMonthSamePeriodRevenue) * 1000) / 10
      : null;

  const ordersGrowthRate =
    lastMonthSamePeriodOrdersCount > 0
      ? Math.round(((currentMonthOrdersCount - lastMonthSamePeriodOrdersCount) / lastMonthSamePeriodOrdersCount) * 1000) / 10
      : null;

  const pendingShipments = currentMonthOrders.filter((order) => order.status === "待發貨").length;
  const rmaCount = currentMonthOrders.filter((order) => order.status === "退貨申請" || order.status === "已取消").length;

  // 各平台分組統計
  const platformStats: PlatformOverviewStat[] = platforms.map((platform) => {
    const currentOrders = currentMonthOrders.filter((order) => order.channelCode === platform.code);
    const lastOrders = lastMonthOrders.filter((order) => order.channelCode === platform.code);

    const platformCurrentRevenue = currentOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const platformLastRevenue = lastOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    const platformCurrentOrders = countEffectiveOrders(currentOrders);
    const platformLastOrders = countEffectiveOrders(lastOrders);

    const platformCurrentAov =
      platformCurrentOrders > 0 ? Math.round(platformCurrentRevenue / platformCurrentOrders) : 0;
    const platformLastAov = platformLastOrders > 0 ? Math.round(platformLastRevenue / platformLastOrders) : 0;

    const sharePercentage =
      currentMonthRevenue > 0 ? Math.round((platformCurrentRevenue / currentMonthRevenue) * 1000) / 10 : 0;

    const platformPending = currentOrders.filter((order) => order.status === "待發貨").length;

    return {
      code: platform.code,
      name: platform.name,
      logo: platform.logo,
      logoObjectFit: platform.logoObjectFit,
      color: platform.color,
      bgcolor: platform.bgcolor,
      borderColor: platform.borderColor,
      currentMonthRevenue: platformCurrentRevenue,
      lastMonthRevenue: platformLastRevenue,
      currentMonthOrders: platformCurrentOrders,
      lastMonthOrders: platformLastOrders,
      currentMonthAov: platformCurrentAov,
      lastMonthAov: platformLastAov,
      sharePercentage,
      pendingShipment: platformPending,
    };
  });

  // 當月每日趨勢（從 1 號到今日）
  const dailyTrends: DailySalesTrendItem[] = [];
  let cumulative = 0;
  const { currentYear, currentMonthNumber, todayDay } = dateRanges;

  for (let day = 1; day <= todayDay; day += 1) {
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(currentMonthNumber).padStart(2, "0");
    const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

    const dayOrders = currentMonthOrders.filter((order) => extractDatePrefix(order.createdAt) === dateKey);
    const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    cumulative += dayRevenue;

    dailyTrends.push({
      date: dateKey,
      label: `${currentMonthNumber}/${day}`,
      day,
      revenue: dayRevenue,
      orderCount: countEffectiveOrders(dayOrders),
      cumulativeRevenue: cumulative,
    });
  }

  return {
    currentMonthRevenue,
    lastMonthRevenue,
    lastMonthSamePeriodRevenue,
    currentMonthOrders: currentMonthOrdersCount,
    lastMonthOrders: lastMonthOrdersCount,
    currentMonthAov,
    lastMonthAov,
    revenueGrowthRate,
    ordersGrowthRate,
    pendingShipments,
    rmaCount,
    platformStats,
    dailyTrends,
    currentMonthLabel: `${currentMonthNumber}月迄今`,
    lastMonthLabel: `${dateRanges.lastMonthNumber}月全月`,
  };
}

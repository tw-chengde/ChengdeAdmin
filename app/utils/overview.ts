import type { PlatformSalesStatistics } from "@/app/lib/platforms/sales";
import type { PlatformDefinition } from "@/app/lib/platforms/types";

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
  /**
   * 當月有業績、但 API 不提供日期而進不了逐日走勢的平台名稱。
   *
   * 這些平台的業績仍計入 KPI 卡，走勢圖卻看不到，累計金額因此對不上當月營收。
   * 這是平台 API 的限制補不了，但要講出來，畫面才能標註而不是讓使用者自己發現兜不攏。
   */
  dailyTrendUncoveredPlatforms: string[];
  currentMonthLabel: string;
  lastMonthLabel: string;
}

/** 單一平台餵給總覽的原始數字。跨平台的佔比與成長率由 calculateOverviewMetrics 算。 */
export interface PlatformOverviewInput {
  definition: PlatformDefinition;
  currentMonth: PlatformSalesStatistics;
  lastMonth: PlatformSalesStatistics;
  lastMonthSamePeriod: PlatformSalesStatistics;
  /** 當月待出貨單數。 */
  pendingShipmentCount: number;
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

const sumBy = <T>(items: T[], valueOf: (item: T) => number) => items.reduce((sum, item) => sum + valueOf(item), 0);

const averageOrderValue = (revenue: number, orderCount: number) =>
  orderCount > 0 ? Math.round(revenue / orderCount) : 0;

/** 相對上月同期的成長率（百分比，一位小數）；基期為零時無從比較，回 null。 */
const growthRate = (current: number, base: number) =>
  base > 0 ? Math.round(((current - base) / base) * 1000) / 10 : null;

/**
 * 計算跨平台加總總覽指標與每日趨勢。純函式，方便測試與共用。
 */
export function calculateOverviewMetrics(
  platforms: PlatformOverviewInput[],
  dateRanges: OverviewDateRanges = getOverviewDateRanges(),
): OverviewMetrics {
  const currentMonthRevenue = sumBy(platforms, (p) => p.currentMonth.revenue);
  const lastMonthRevenue = sumBy(platforms, (p) => p.lastMonth.revenue);
  const lastMonthSamePeriodRevenue = sumBy(platforms, (p) => p.lastMonthSamePeriod.revenue);

  const currentMonthOrdersCount = sumBy(platforms, (p) => p.currentMonth.orderCount);
  const lastMonthOrdersCount = sumBy(platforms, (p) => p.lastMonth.orderCount);
  const lastMonthSamePeriodOrdersCount = sumBy(platforms, (p) => p.lastMonthSamePeriod.orderCount);

  const currentMonthAov = averageOrderValue(currentMonthRevenue, currentMonthOrdersCount);
  const lastMonthAov = averageOrderValue(lastMonthRevenue, lastMonthOrdersCount);

  const revenueGrowthRate = growthRate(currentMonthRevenue, lastMonthSamePeriodRevenue);
  const ordersGrowthRate = growthRate(currentMonthOrdersCount, lastMonthSamePeriodOrdersCount);

  const pendingShipments = sumBy(platforms, (p) => p.pendingShipmentCount);
  const rmaCount = sumBy(platforms, (p) => p.currentMonth.returnCount);

  const platformStats: PlatformOverviewStat[] = platforms.map(({ definition, currentMonth, lastMonth, pendingShipmentCount }) => ({
    code: definition.code,
    name: definition.name,
    logo: definition.logo,
    logoObjectFit: definition.logoObjectFit,
    color: definition.color,
    bgcolor: definition.bgcolor,
    borderColor: definition.borderColor,
    currentMonthRevenue: currentMonth.revenue,
    lastMonthRevenue: lastMonth.revenue,
    currentMonthOrders: currentMonth.orderCount,
    lastMonthOrders: lastMonth.orderCount,
    currentMonthAov: averageOrderValue(currentMonth.revenue, currentMonth.orderCount),
    lastMonthAov: averageOrderValue(lastMonth.revenue, lastMonth.orderCount),
    sharePercentage:
      currentMonthRevenue > 0 ? Math.round((currentMonth.revenue / currentMonthRevenue) * 1000) / 10 : 0,
    pendingShipment: pendingShipmentCount,
  }));

  // 把各平台的逐日銷售併成一張日期表，再展開成 1 號到今日的連續走勢。
  const salesByDate = new Map<string, { revenue: number; orderCount: number }>();
  for (const platform of platforms) {
    for (const day of platform.currentMonth.daily) {
      const totals = salesByDate.get(day.date) ?? { revenue: 0, orderCount: 0 };
      totals.revenue += day.revenue;
      totals.orderCount += day.orderCount;
      salesByDate.set(day.date, totals);
    }
  }

  const { currentYear, currentMonthNumber, todayDay } = dateRanges;
  const dailyTrends: DailySalesTrendItem[] = [];
  let cumulative = 0;

  for (let day = 1; day <= todayDay; day += 1) {
    const monthStr = String(currentMonthNumber).padStart(2, "0");
    const dateKey = `${currentYear}-${monthStr}-${String(day).padStart(2, "0")}`;
    const totals = salesByDate.get(dateKey) ?? { revenue: 0, orderCount: 0 };
    cumulative += totals.revenue;

    dailyTrends.push({
      date: dateKey,
      label: `${currentMonthNumber}/${day}`,
      day,
      revenue: totals.revenue,
      orderCount: totals.orderCount,
      cumulativeRevenue: cumulative,
    });
  }

  // 有業績卻沒有任何逐日資料的平台，就是走勢圖看不到的那些。
  const dailyTrendUncoveredPlatforms = platforms
    .filter((platform) => platform.currentMonth.revenue > 0 && platform.currentMonth.daily.length === 0)
    .map((platform) => platform.definition.name);

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
    dailyTrendUncoveredPlatforms,
    currentMonthLabel: `${currentMonthNumber}月迄今`,
    lastMonthLabel: `${dateRanges.lastMonthNumber}月全月`,
  };
}

import assert from "node:assert/strict";
import { test } from "vitest";
import { momoDefinition, moStorePlusDefinition } from "@/app/lib/platforms/definitions";
import type { PlatformSalesStatistics } from "@/app/lib/platforms/sales";
import {
  calculateOverviewMetrics,
  getOverviewDateRanges,
  type PlatformOverviewInput,
} from "@/app/utils/overview";

function stats(
  revenue: number,
  orderCount: number,
  daily: PlatformSalesStatistics["daily"] = [],
  returnCount = 0,
): PlatformSalesStatistics {
  return { revenue, orderCount, returnCount, daily };
}

/**
 * momo 的統計 API 只給商品層級的加總、沒有日期，因此 daily 一律為空；
 * mo店+ 回得出逐筆訂單，逐日走勢就有資料。兩種平台的差異刻意保留在測試資料裡。
 */
const samplePlatforms: PlatformOverviewInput[] = [
  {
    definition: momoDefinition,
    currentMonth: stats(2500, 3, [], 2),
    lastMonth: stats(2000, 3),
    lastMonthSamePeriod: stats(1000, 1),
    pendingShipmentCount: 1,
  },
  {
    definition: moStorePlusDefinition,
    currentMonth: stats(1500, 1, [{ date: "2026-08-10", revenue: 1500, orderCount: 1 }]),
    lastMonth: stats(2000, 1),
    lastMonthSamePeriod: stats(2000, 1),
    pendingShipmentCount: 0,
  },
];

test("getOverviewDateRanges correctly generates current month and last month ranges", () => {
  const fixedDate = new Date("2026-08-14T10:00:00+08:00");
  const ranges = getOverviewDateRanges(fixedDate);

  assert.equal(ranges.currentMonth.startDate, "2026-08-01");
  assert.equal(ranges.currentMonth.endDate, "2026-08-14");
  assert.equal(ranges.lastMonth.startDate, "2026-07-01");
  assert.equal(ranges.lastMonth.endDate, "2026-07-31");
  assert.equal(ranges.lastMonthSamePeriod.startDate, "2026-07-01");
  assert.equal(ranges.lastMonthSamePeriod.endDate, "2026-07-14");
  assert.equal(ranges.currentMonthNumber, 8);
  assert.equal(ranges.lastMonthNumber, 7);
  assert.equal(ranges.todayDay, 14);
});

test("getOverviewDateRanges handles January crossover to previous year's December", () => {
  const januaryDate = new Date("2026-01-10T12:00:00+08:00");
  const ranges = getOverviewDateRanges(januaryDate);

  assert.equal(ranges.currentMonth.startDate, "2026-01-01");
  assert.equal(ranges.currentMonth.endDate, "2026-01-10");
  assert.equal(ranges.lastMonth.startDate, "2025-12-01");
  assert.equal(ranges.lastMonth.endDate, "2025-12-31");
  assert.equal(ranges.lastMonthSamePeriod.endDate, "2025-12-10");
  assert.equal(ranges.lastMonthNumber, 12);
});

test("calculateOverviewMetrics aggregates revenue, orders, AOV and platform breakdown correctly", () => {
  const ranges = getOverviewDateRanges(new Date("2026-08-14T10:00:00+08:00"));

  const metrics = calculateOverviewMetrics(samplePlatforms, ranges);

  // 當月加總營收：2500 + 1500 = 4000
  assert.equal(metrics.currentMonthRevenue, 4000);
  // 上月全月營收：2000 + 2000 = 4000
  assert.equal(metrics.lastMonthRevenue, 4000);
  // 上月同期營收：1000 + 2000 = 3000
  assert.equal(metrics.lastMonthSamePeriodRevenue, 3000);

  // 訂單數與客單價
  assert.equal(metrics.currentMonthOrders, 4);
  assert.equal(metrics.lastMonthOrders, 4);
  assert.equal(metrics.currentMonthAov, 1000); // 4000 / 4
  assert.equal(metrics.lastMonthAov, 1000); // 4000 / 4

  // 成長率（相比上月同期 3000，當月 4000 -> (4000 - 3000) / 3000 = +33.3%）
  assert.equal(metrics.revenueGrowthRate, 33.3);
  assert.equal(metrics.ordersGrowthRate, 100); // (4 - 2) / 2 = +100%

  // 待出貨與退貨由各平台自行回報後加總
  assert.equal(metrics.pendingShipments, 1);
  assert.equal(metrics.rmaCount, 2);

  const momoStat = metrics.platformStats.find((s) => s.code === "MOMO_MAIN");
  const moStoreStat = metrics.platformStats.find((s) => s.code === "MO_STORE_PLUS");

  assert.ok(momoStat);
  assert.ok(moStoreStat);

  assert.equal(momoStat.currentMonthRevenue, 2500);
  assert.equal(momoStat.lastMonthRevenue, 2000);
  assert.equal(momoStat.currentMonthOrders, 3);
  assert.equal(momoStat.lastMonthOrders, 3);
  assert.equal(momoStat.currentMonthAov, 833); // 2500 / 3
  assert.equal(momoStat.sharePercentage, 62.5); // 2500 / 4000
  assert.equal(momoStat.pendingShipment, 1);

  assert.equal(moStoreStat.currentMonthRevenue, 1500);
  assert.equal(moStoreStat.lastMonthRevenue, 2000);
  assert.equal(moStoreStat.currentMonthOrders, 1);
  assert.equal(moStoreStat.sharePercentage, 37.5); // 1500 / 4000
  assert.equal(moStoreStat.pendingShipment, 0);
});

test("calculateOverviewMetrics 把各平台的逐日銷售疊成當月走勢", () => {
  const ranges = getOverviewDateRanges(new Date("2026-08-14T10:00:00+08:00"));

  const metrics = calculateOverviewMetrics(
    [
      {
        definition: momoDefinition,
        currentMonth: stats(3000, 2, [
          { date: "2026-08-01", revenue: 2000, orderCount: 2 },
          { date: "2026-08-05", revenue: 1000, orderCount: 1 },
        ]),
        lastMonth: stats(0, 0),
        lastMonthSamePeriod: stats(0, 0),
        pendingShipmentCount: 0,
      },
      {
        definition: moStorePlusDefinition,
        currentMonth: stats(1500, 1, [{ date: "2026-08-01", revenue: 1500, orderCount: 1 }]),
        lastMonth: stats(0, 0),
        lastMonthSamePeriod: stats(0, 0),
        pendingShipmentCount: 0,
      },
    ],
    ranges,
  );

  assert.equal(metrics.dailyTrends.length, 14);
  assert.equal(metrics.dailyTrends[0]?.revenue, 3500); // 8/1 兩平台相加
  assert.equal(metrics.dailyTrends[0]?.orderCount, 3);
  assert.equal(metrics.dailyTrends[4]?.revenue, 1000); // 8/5
  assert.equal(metrics.dailyTrends[13]?.cumulativeRevenue, 4500);
  assert.deepEqual(metrics.dailyTrendUncoveredPlatforms, []);
});

/**
 * momo 的接單統計 API 不回日期，走勢圖因此永遠少掉 momo 的業績，
 * 累計金額對不上當月營收 KPI。這是平台 API 的限制，補不了，
 * 但要明講是哪些平台沒被涵蓋，畫面才能標註而不是讓使用者自己發現數字兜不攏。
 */
test("calculateOverviewMetrics 標出沒有逐日資料但有業績的平台", () => {
  const ranges = getOverviewDateRanges(new Date("2026-08-14T10:00:00+08:00"));

  const metrics = calculateOverviewMetrics(samplePlatforms, ranges);

  assert.deepEqual(metrics.dailyTrendUncoveredPlatforms, [momoDefinition.name]);
  // 走勢只涵蓋 mo店+ 的 1500，與當月營收 4000 有落差。
  assert.equal(metrics.dailyTrends[13]?.cumulativeRevenue, 1500);
});

test("calculateOverviewMetrics handles empty statistics gracefully", () => {
  const ranges = getOverviewDateRanges(new Date("2026-08-14T10:00:00+08:00"));

  const metrics = calculateOverviewMetrics(
    [
      {
        definition: momoDefinition,
        currentMonth: stats(0, 0),
        lastMonth: stats(0, 0),
        lastMonthSamePeriod: stats(0, 0),
        pendingShipmentCount: 0,
      },
    ],
    ranges,
  );

  assert.equal(metrics.currentMonthRevenue, 0);
  assert.equal(metrics.lastMonthRevenue, 0);
  assert.equal(metrics.currentMonthOrders, 0);
  assert.equal(metrics.currentMonthAov, 0);
  assert.equal(metrics.revenueGrowthRate, null);
  assert.equal(metrics.pendingShipments, 0);
  assert.equal(metrics.platformStats[0]?.sharePercentage, 0);
  // 沒有業績的平台不必標註走勢缺漏。
  assert.deepEqual(metrics.dailyTrendUncoveredPlatforms, []);
});

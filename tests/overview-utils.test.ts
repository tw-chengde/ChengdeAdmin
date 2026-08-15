import assert from "node:assert/strict";
import { test } from "vitest";
import { momoDefinition, moStorePlusDefinition } from "@/app/lib/platforms/definitions";
import type { OrderItem } from "@/app/types/order";
import {
  calculateOverviewMetrics,
  getOverviewDateRanges,
} from "@/app/utils/overview";

const sampleCurrentMonthOrders: OrderItem[] = [
  {
    id: "momo:1",
    channel: "MOMO 購物網",
    channelCode: "MOMO_MAIN",
    orderNo: "MO-101",
    customerName: "張小美",
    address: "台北市",
    items: [{ name: "保溫瓶", spec: "黑", qty: 2, price: 1000 }],
    totalAmount: 2000,
    status: "待發貨",
    logistics: "MOMO 宅配通",
    trackingNo: "TRK1",
    createdAt: "2026-08-01 10:00",
  },
  {
    id: "momo:2",
    channel: "MOMO 購物網",
    channelCode: "MOMO_MAIN",
    orderNo: "MO-102",
    customerName: "李大同",
    address: "新北市",
    items: [{ name: "咖啡豆", spec: "500g", qty: 1, price: 500 }],
    totalAmount: 500,
    status: "已完成",
    logistics: "MOMO 宅配通",
    trackingNo: "TRK2",
    createdAt: "2026-08-05 14:30",
  },
  {
    id: "mo-store-plus:1",
    channel: "Mo 店+",
    channelCode: "MO_STORE_PLUS",
    orderNo: "MS-201",
    customerName: "王小明",
    address: "台中市",
    items: [{ name: "檯燈", spec: "白", qty: 1, price: 1500 }],
    totalAmount: 1500,
    status: "配送中",
    logistics: "7-11 超商取貨",
    trackingNo: "TRK3",
    createdAt: "2026-08-10 09:15",
  },
];

const sampleLastMonthOrders: OrderItem[] = [
  {
    id: "momo:old1",
    channel: "MOMO 購物網",
    channelCode: "MOMO_MAIN",
    orderNo: "MO-001",
    customerName: "陳小芬",
    address: "台北市",
    items: [{ name: "保溫瓶", spec: "黑", qty: 1, price: 1000 }],
    totalAmount: 1000,
    status: "已完成",
    logistics: "MOMO 宅配通",
    trackingNo: "TRK01",
    createdAt: "2026-07-02 11:00",
  },
  {
    id: "mo-store-plus:old2",
    channel: "Mo 店+",
    channelCode: "MO_STORE_PLUS",
    orderNo: "MS-002",
    customerName: "林小華",
    address: "高雄市",
    items: [{ name: "快煮壺", spec: "銀", qty: 1, price: 2000 }],
    totalAmount: 2000,
    status: "已完成",
    logistics: "全家超商取貨",
    trackingNo: "TRK02",
    createdAt: "2026-07-10 16:00",
  },
  {
    id: "momo:old3",
    channel: "MOMO 購物網",
    channelCode: "MOMO_MAIN",
    orderNo: "MO-003",
    customerName: "趙先生",
    address: "台南市",
    items: [{ name: "咖啡豆", spec: "500g", qty: 2, price: 500 }],
    totalAmount: 1000,
    status: "已完成",
    logistics: "黑貓宅急便",
    trackingNo: "TRK03",
    createdAt: "2026-07-28 20:00",
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
  const fixedDate = new Date("2026-08-14T10:00:00+08:00");
  const ranges = getOverviewDateRanges(fixedDate);
  const platforms = [momoDefinition, moStorePlusDefinition];

  const metrics = calculateOverviewMetrics(sampleCurrentMonthOrders, sampleLastMonthOrders, platforms, ranges);

  // 當月加總營收：2000 + 500 + 1500 = 4000
  assert.equal(metrics.currentMonthRevenue, 4000);
  // 上月全月營收：1000 + 2000 + 1000 = 4000
  assert.equal(metrics.lastMonthRevenue, 4000);
  // 上月同期營收（截至 7/14）：MO-001 (1000) + MS-002 (2000) = 3000
  assert.equal(metrics.lastMonthSamePeriodRevenue, 3000);

  // 訂單數與客單價
  assert.equal(metrics.currentMonthOrders, 4);
  assert.equal(metrics.lastMonthOrders, 4);
  assert.equal(metrics.currentMonthAov, 1000); // 4000 / 4
  assert.equal(metrics.lastMonthAov, 1000); // 4000 / 4

  // 成長率（相比上月同期 3000，當月 4000 -> (4000 - 3000) / 3000 = +33.3%）
  assert.equal(metrics.revenueGrowthRate, 33.3);
  assert.equal(metrics.ordersGrowthRate, 100); // (4 - 2) / 2 = +100%

  // 待出貨數
  assert.equal(metrics.pendingShipments, 1);

  // 各平台統計
  const momoStat = metrics.platformStats.find((s) => s.code === "MOMO_MAIN");
  const moStoreStat = metrics.platformStats.find((s) => s.code === "MO_STORE_PLUS");

  assert.ok(momoStat);
  assert.ok(moStoreStat);

  assert.equal(momoStat.currentMonthRevenue, 2500);
  assert.equal(momoStat.lastMonthRevenue, 2000);
  assert.equal(momoStat.currentMonthOrders, 3);
  assert.equal(momoStat.lastMonthOrders, 3);
  assert.equal(momoStat.sharePercentage, 62.5); // 2500 / 4000 = 62.5%
  assert.equal(momoStat.pendingShipment, 1);

  assert.equal(moStoreStat.currentMonthRevenue, 1500);
  assert.equal(moStoreStat.lastMonthRevenue, 2000);
  assert.equal(moStoreStat.currentMonthOrders, 1);
  assert.equal(moStoreStat.lastMonthOrders, 1);
  assert.equal(moStoreStat.sharePercentage, 37.5); // 1500 / 4000 = 37.5%
  assert.equal(moStoreStat.pendingShipment, 0);

  // 每日走勢陣列長度應等於今日日數 14
  assert.equal(metrics.dailyTrends.length, 14);
  assert.equal(metrics.dailyTrends[0]?.revenue, 2000); // 8/1
  assert.equal(metrics.dailyTrends[0]?.orderCount, 2); // 8/1 momo qty 2
  assert.equal(metrics.dailyTrends[4]?.revenue, 500); // 8/5
  assert.equal(metrics.dailyTrends[4]?.orderCount, 1); // 8/5 momo qty 1
  assert.equal(metrics.dailyTrends[9]?.revenue, 1500); // 8/10
  assert.equal(metrics.dailyTrends[9]?.orderCount, 1); // 8/10 mo-store 1
  assert.equal(metrics.dailyTrends[13]?.cumulativeRevenue, 4000); // 8/14 累計
});

test("calculateOverviewMetrics handles empty order lists gracefully", () => {
  const fixedDate = new Date("2026-08-14T10:00:00+08:00");
  const ranges = getOverviewDateRanges(fixedDate);
  const platforms = [momoDefinition];

  const metrics = calculateOverviewMetrics([], [], platforms, ranges);

  assert.equal(metrics.currentMonthRevenue, 0);
  assert.equal(metrics.lastMonthRevenue, 0);
  assert.equal(metrics.currentMonthOrders, 0);
  assert.equal(metrics.currentMonthAov, 0);
  assert.equal(metrics.revenueGrowthRate, null);
  assert.equal(metrics.pendingShipments, 0);
  assert.equal(metrics.platformStats[0]?.sharePercentage, 0);
});

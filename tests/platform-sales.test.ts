import assert from "node:assert/strict";
import { test } from "vitest";
import { emptySalesStatistics, summarizeOrders } from "@/app/lib/platforms/sales";
import type { OrderItem } from "@/app/types/order";
import type { OrderStatus } from "@/app/types/order";

function order(overrides: Partial<OrderItem> & { totalAmount: number; createdAt: string }): OrderItem {
  return {
    id: "mo-store-plus:1",
    channel: "Mo 店+",
    channelCode: "MO_STORE_PLUS",
    orderNo: "MS-1",
    customerName: "顧客",
    address: "台北市",
    items: [],
    status: "已完成" as OrderStatus,
    logistics: "超取",
    trackingNo: "",
    ...overrides,
  };
}

test("summarizeOrders 以訂單為單位加總營收與筆數", () => {
  const stats = summarizeOrders([
    order({ totalAmount: 2000, createdAt: "2026-08-01 10:00" }),
    order({ totalAmount: 500, createdAt: "2026-08-05 14:30" }),
  ]);

  assert.equal(stats.revenue, 2500);
  assert.equal(stats.orderCount, 2);
});

test("summarizeOrders 依日期彙總逐日銷售", () => {
  const stats = summarizeOrders([
    order({ totalAmount: 2000, createdAt: "2026-08-01 10:00" }),
    order({ totalAmount: 1000, createdAt: "2026-08-01 18:00" }),
    order({ totalAmount: 500, createdAt: "2026-08-05 14:30" }),
  ]);

  assert.deepEqual(stats.daily, [
    { date: "2026-08-01", revenue: 3000, orderCount: 2 },
    { date: "2026-08-05", revenue: 500, orderCount: 1 },
  ]);
});

// 平台沒回日期的訂單仍要算進區間總額，只是無法歸到某一天。
test("summarizeOrders 對沒有日期的訂單仍計入總額但不進逐日走勢", () => {
  const stats = summarizeOrders([
    order({ totalAmount: 800, createdAt: "" }),
    order({ totalAmount: 200, createdAt: "2026-08-03 09:00" }),
  ]);

  assert.equal(stats.revenue, 1000);
  assert.equal(stats.orderCount, 2);
  assert.deepEqual(stats.daily, [{ date: "2026-08-03", revenue: 200, orderCount: 1 }]);
});

test("summarizeOrders 把退貨申請與已取消的訂單算進 returnCount", () => {
  const stats = summarizeOrders([
    order({ totalAmount: 1000, createdAt: "2026-08-01 10:00", status: "退貨申請" }),
    order({ totalAmount: 1000, createdAt: "2026-08-02 10:00", status: "已取消" }),
    order({ totalAmount: 1000, createdAt: "2026-08-03 10:00", status: "已完成" }),
  ]);

  assert.equal(stats.returnCount, 2);
});

test("emptySalesStatistics 回傳全零的統計", () => {
  assert.deepEqual(emptySalesStatistics(), { revenue: 0, orderCount: 0, returnCount: 0, daily: [] });
});

import assert from "node:assert/strict";
import { test } from "vitest";
import type { OrderItem } from "@/app/types/order";
import {
  MAX_DATE_RANGE_DAYS,
  channelStyle,
  filterOrders,
  formatDate,
  getMaxEndDate,
  orderStats,
  resolveOrderDateRange,
  statusStyle,
} from "@/app/utils/orders";
import { getAllPlatformDefinitions } from "@/app/lib/platforms/definitions";
import { mockOrders } from "./mocks/orders";

test("statusStyle returns correct styles", () => {
  assert.equal(statusStyle("待發貨").color, "#b54708");
  assert.equal(statusStyle("配送中").color, "#175cd3");
  assert.equal(statusStyle("已完成").color, "#027a48");
  assert.equal(statusStyle("待付款").color, "#c01048");
  assert.equal(statusStyle("退貨申請").color, "#b42318");
  assert.equal(statusStyle("已取消").color, "#344054");
  // 刻意傳入型別外的值，確認來自 API 的未知狀態會落到預設樣式而不是壞掉。
  assert.equal(statusStyle("UNKNOWN_STATUS" as OrderItem["status"]).color, "#344054");
});

test("channelStyle 與 platform registry 保持一致", () => {
  for (const def of getAllPlatformDefinitions()) {
    const style = channelStyle(def.code);
    assert.equal(style.name, def.name);
    assert.equal(style.color, def.color);
    assert.equal(style.bgcolor, def.bgcolor);
    assert.equal(style.borderColor, def.borderColor);
    assert.equal(style.gradient, def.gradient);
  }
});

test("channelStyle 對 registry 中不存在的通路回傳可用的預設樣式", () => {
  // 舊訂單或 API 回傳了已下架的通路代碼時，畫面不該壞掉或顯示空白標籤。
  const style = channelStyle("UNKNOWN_CHANNEL" as OrderItem["channelCode"]);
  assert.equal(style.name, "UNKNOWN_CHANNEL");
  assert.equal(style.color, "#344054");
  assert.ok(style.bgcolor);
  assert.ok(style.borderColor);
  assert.ok(style.gradient);
});

test("resolveOrderDateRange 以台北時區換算起迄時間", () => {
  const { from, to } = resolveOrderDateRange({ startDate: "2026-08-01", endDate: "2026-08-02" });

  assert.equal(from.toISOString(), "2026-07-31T16:00:00.000Z");
  assert.equal(to.toISOString(), "2026-08-02T15:59:59.999Z");
});

test("resolveOrderDateRange 擋掉格式錯誤與顛倒的區間", () => {
  assert.throws(() => resolveOrderDateRange({ startDate: "2026/08/01", endDate: "2026-08-02" }), /Invalid date format/);
  assert.throws(() => resolveOrderDateRange({ startDate: "2026-08-01", endDate: "not-a-date" }), /Invalid date format/);
  assert.throws(
    () => resolveOrderDateRange({ startDate: "2026-08-03", endDate: "2026-08-01" }),
    /Start date cannot be after end date/,
  );
});

// 前端的日期選擇器與後端的檢查必須用同一個上限，否則會出現「選得到卻查不動」。
test("resolveOrderDateRange 的上限與 getMaxEndDate 一致", () => {
  const startDate = "2026-08-01";
  const maxEndDate = getMaxEndDate(startDate);

  assert.doesNotThrow(() => resolveOrderDateRange({ startDate, endDate: maxEndDate }));

  // 用與 getMaxEndDate 相同的方式往後推一天，確認再多一天就會被擋下。
  const dayAfterMax = new Date(`${maxEndDate}T00:00:00+08:00`);
  dayAfterMax.setDate(dayAfterMax.getDate() + 1);
  assert.throws(
    () => resolveOrderDateRange({ startDate, endDate: formatDate(dayAfterMax) }),
    new RegExp(`起迄日期最大區間為 ${MAX_DATE_RANGE_DAYS} 天`),
  );
});

// 日期是送進平台 API 的查詢條件，前端不該再篩一次——否則各平台日期格式不一時會誤刪資料。
test("filterOrders 不因訂單日期而過濾掉任何一筆", () => {
  const outOfRange = filterOrders(mockOrders, { channelTab: "MOMO_MAIN", searchQuery: "" });
  assert.equal(outOfRange.length, mockOrders.filter((order) => order.channelCode === "MOMO_MAIN").length);
  assert.ok(new Set(mockOrders.map((order) => order.createdAt.slice(0, 10))).size > 1, "mock 需涵蓋多個日期");
});

test("filterOrders 依通路與關鍵字篩選", () => {
  const all = filterOrders(mockOrders, { channelTab: "MOMO_MAIN", searchQuery: "" });
  assert.equal(all.length, mockOrders.filter((order) => order.channelCode === "MOMO_MAIN").length);

  const momoOnly = filterOrders(mockOrders, { channelTab: "MOMO_MAIN", searchQuery: "" });
  assert.ok(momoOnly.length > 0);
  assert.ok(momoOnly.every((order) => order.channelCode === "MOMO_MAIN"));

  const target = mockOrders[0];
  assert.deepEqual(
    filterOrders(mockOrders, { channelTab: "MOMO_MAIN", searchQuery: `  ${target.orderNo.toLowerCase()} ` }).map((o) => o.id),
    [target.id],
  );
});

test("orderStats 只受通路影響", () => {
  const selectedPlatformOrders = mockOrders.filter((order) => order.channelCode === "MOMO_MAIN");
  const selected = orderStats(mockOrders, "MOMO_MAIN");
  assert.equal(selected.totalOrders, selectedPlatformOrders.length);
  assert.equal(selected.totalRevenue, selectedPlatformOrders.reduce((sum, order) => sum + order.totalAmount, 0));
  assert.equal(selected.pendingShipment, selectedPlatformOrders.filter((order) => order.status === "待發貨").length);
  const momo = orderStats(mockOrders, "MOMO_MAIN");
  const momoOrders = mockOrders.filter((order) => order.channelCode === "MOMO_MAIN");
  assert.equal(momo.totalOrders, momoOrders.length);
  assert.equal(momo.totalRevenue, momoOrders.reduce((sum, order) => sum + order.totalAmount, 0));
});

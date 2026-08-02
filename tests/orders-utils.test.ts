import assert from "node:assert/strict";
import { test } from "vitest";
import type { OrderItem } from "@/app/types/order";
import { channelStyle, statusStyle } from "@/app/utils/orders";

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

test("channelStyle returns correct styles", () => {
  const momoStyle = channelStyle("MOMO_MAIN");
  assert.equal(momoStyle.name, "MOMO 購物網");
  assert.equal(momoStyle.color, "#ec008c");

  const moStorePlusStyle = channelStyle("MO_STORE_PLUS");
  assert.equal(moStorePlusStyle.name, "Mo 店+");
  assert.equal(moStorePlusStyle.color, "#ff6b00");
});

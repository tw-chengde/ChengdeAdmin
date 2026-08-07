import assert from "node:assert/strict";
import { test } from "vitest";
import type { OrderItem } from "@/app/types/order";
import { channelStyle, statusStyle } from "@/app/utils/orders";
import { getAllPlatformDefinitions } from "@/app/lib/platforms/registry";

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

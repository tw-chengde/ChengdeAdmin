import { act, renderHook } from "@testing-library/react";
import assert from "node:assert/strict";
import { test } from "vitest";
import { useOrdersViewModel } from "@/app/hooks/useOrdersViewModel";
import { mockOrders } from "./mocks/orders";

// 關鍵字比對的細節（多欄位、大小寫、前後空白、查無資料）屬於 filterOrders 本身，
// 由 orders-utils.test.ts 驗證；這裡只測 hook 自己的 state 轉換。
test("預設帶入傳入的通路，切換後只留下該通路的訂單", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders, "MOMO_MAIN"));

  assert.equal(result.current.channelTab, "MOMO_MAIN");
  assert.ok(result.current.filteredOrders.length > 0, "mock 資料需包含 MOMO_MAIN 訂單");
  assert.ok(result.current.filteredOrders.every((o) => o.channelCode === "MOMO_MAIN"));

  act(() => result.current.setChannelTab("MO_STORE_PLUS"));
  assert.ok(result.current.filteredOrders.every((o) => o.channelCode === "MO_STORE_PLUS"));
});

test("通路與關鍵字的篩選條件會疊加", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders, "MOMO_MAIN"));
  const target = mockOrders.find((order) => order.channelCode === "MOMO_MAIN");
  assert.ok(target, "mock 資料需包含 MOMO_MAIN 訂單");

  act(() => result.current.setChannelTab("MOMO_MAIN"));
  act(() => result.current.setSearchQuery(target.customerName));

  assert.ok(result.current.filteredOrders.length > 0);
  assert.ok(
    result.current.filteredOrders.every(
      (o) => o.channelCode === "MOMO_MAIN" && o.customerName.includes(target.customerName),
    ),
  );
});

// 統計數字本身由 orders-utils.test.ts 的 orderStats 驗證；這裡守的是
// 「搜尋只影響清單、不影響統計」這件 hook 才決定得了的事。
test("統計不受搜尋影響", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders, "MOMO_MAIN"));

  const platformOrders = mockOrders.filter((order) => order.channelCode === "MOMO_MAIN");
  const allRevenue = platformOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  assert.equal(result.current.stats.totalOrders, platformOrders.length);
  assert.equal(result.current.stats.totalRevenue, allRevenue);

  act(() => result.current.setSearchQuery("NO_SUCH_ORDER_XYZ"));

  assert.equal(result.current.filteredOrders.length, 0);
  assert.equal(result.current.stats.totalOrders, platformOrders.length);
  assert.equal(result.current.stats.totalRevenue, allRevenue);
});

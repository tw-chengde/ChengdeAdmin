import { act, renderHook } from "@testing-library/react";
import assert from "node:assert/strict";
import { test } from "vitest";
import { useOrdersViewModel } from "@/app/hooks/useOrdersViewModel";
import { mockOrders } from "./mocks/orders";

test("預設顯示全部訂單", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders));
  assert.equal(result.current.filteredOrders.length, mockOrders.length);
  assert.equal(result.current.channelTab, "ALL");
  assert.equal(result.current.statusTab, "ALL");
});

test("切換通路只留下該通路的訂單", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders));

  act(() => result.current.setChannelTab("MOMO_MAIN"));
  assert.ok(result.current.filteredOrders.length > 0, "mock 資料需包含 MOMO_MAIN 訂單");
  assert.ok(result.current.filteredOrders.every((o) => o.channelCode === "MOMO_MAIN"));

  act(() => result.current.setChannelTab("MO_STORE_PLUS"));
  assert.ok(result.current.filteredOrders.every((o) => o.channelCode === "MO_STORE_PLUS"));
});

test("狀態與通路的篩選條件會疊加", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders));

  act(() => result.current.setChannelTab("MOMO_MAIN"));
  act(() => result.current.setStatusTab("待發貨"));

  assert.ok(
    result.current.filteredOrders.every(
      (o) => o.channelCode === "MOMO_MAIN" && o.status === "待發貨",
    ),
  );
});

test("搜尋可比對訂單編號、客戶姓名與商品名稱", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders));
  const target = mockOrders[0];

  act(() => result.current.setSearchQuery(target.orderNo));
  assert.deepEqual(
    result.current.filteredOrders.map((o) => o.id),
    [target.id],
  );

  act(() => result.current.setSearchQuery(target.customerName));
  assert.ok(result.current.filteredOrders.some((o) => o.id === target.id));

  act(() => result.current.setSearchQuery(target.items[0].name));
  assert.ok(result.current.filteredOrders.some((o) => o.id === target.id));
});

test("搜尋不分大小寫且忽略前後空白", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders));
  const target = mockOrders[0];

  act(() => result.current.setSearchQuery(`  ${target.orderNo.toLowerCase()}  `));
  assert.ok(result.current.filteredOrders.some((o) => o.id === target.id));
});

test("查無資料時回傳空陣列", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders));
  act(() => result.current.setSearchQuery("NO_SUCH_ORDER_XYZ"));
  assert.equal(result.current.filteredOrders.length, 0);
});

test("統計只受通路影響，不受狀態與搜尋影響", () => {
  const { result } = renderHook(() => useOrdersViewModel(mockOrders));

  const allRevenue = mockOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  assert.equal(result.current.stats.totalOrders, mockOrders.length);
  assert.equal(result.current.stats.totalRevenue, allRevenue);
  assert.equal(
    result.current.stats.pendingShipment,
    mockOrders.filter((o) => o.status === "待發貨").length,
  );
  assert.equal(
    result.current.stats.rmaCount,
    mockOrders.filter((o) => o.status === "退貨申請" || o.status === "已取消").length,
  );

  // 套用狀態篩選與搜尋後，統計數字應維持不變。
  act(() => result.current.setStatusTab("待發貨"));
  act(() => result.current.setSearchQuery("NO_SUCH_ORDER_XYZ"));
  assert.equal(result.current.stats.totalOrders, mockOrders.length);
  assert.equal(result.current.stats.totalRevenue, allRevenue);
});

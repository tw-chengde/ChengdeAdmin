import { act, renderHook, waitFor } from "@testing-library/react";
import assert from "node:assert/strict";
import { test, vi } from "vitest";

const loadShipmentWorkspace = vi.fn();

vi.mock("@/app/dashboard/shipping-actions", () => ({
  loadShipmentWorkspace: (...args: unknown[]) => loadShipmentWorkspace(...args),
}));

const { useShippingWorkspace } = await import("@/app/hooks/useShippingWorkspace");

const order = {
  id: "momo:1",
  channel: "MOMO 購物網",
  channelCode: "MOMO_MAIN" as const,
  orderNo: "1",
  customerName: "客戶",
  address: "",
  items: [{ name: "保溫瓶", spec: "黑", qty: 2, price: 100, goodsdtCode: "D1" }],
  totalAmount: 200,
  status: "待發貨" as const,
  logistics: "",
  trackingNo: "",
  createdAt: "2026-08-01",
};

test("掛載時自動載入一次，並依結果彙總揀貨單", async () => {
  loadShipmentWorkspace.mockResolvedValue({ orders: [order], bindings: [], products: [], failures: [] });

  const { result } = renderHook(() => useShippingWorkspace());

  assert.equal(result.current.loading, false);
  assert.equal(result.current.hasLoaded, false);
  assert.equal(loadShipmentWorkspace.mock.calls.length, 0);

  act(() => result.current.refresh());
  await waitFor(() => assert.equal(result.current.loading, false));

  assert.equal(result.current.hasLoaded, true);
  assert.equal(result.current.workspace.orders.length, 1);
  assert.equal(result.current.pickingSheet.totals.totalQty, 2);
  assert.equal(loadShipmentWorkspace.mock.calls.length, 1);
});

test("refresh 用目前選取的日期區間重新查詢", async () => {
  loadShipmentWorkspace.mockResolvedValue({ orders: [], bindings: [], products: [], failures: [] });
  const { result } = renderHook(() => useShippingWorkspace());
  await waitFor(() => assert.equal(result.current.loading, false));

  act(() => result.current.setDateRange({ startDate: "2026-08-10", endDate: "2026-08-12" }));
  act(() => result.current.refresh());
  await waitFor(() => assert.equal(result.current.loading, false));

  const lastCall = loadShipmentWorkspace.mock.calls.at(-1)?.[0];
  assert.deepEqual(lastCall, { startDate: "2026-08-10", endDate: "2026-08-12" });
});

test("載入失敗時把錯誤訊息放進 loadError，不讓畫面停在載入中", async () => {
  loadShipmentWorkspace.mockRejectedValue(new Error("proxy 未設定"));

  const { result } = renderHook(() => useShippingWorkspace());

  act(() => result.current.refresh());
  await waitFor(() => assert.equal(result.current.loading, false));
  assert.equal(result.current.loadError, "proxy 未設定");
  assert.equal(result.current.hasLoaded, false);
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { ShipmentCandidate } from "@/app/types/shipment";

const previewShipmentPlan = vi.fn();

vi.mock("@/app/dashboard/shipping-actions", () => ({
  previewShipmentPlan: (...args: unknown[]) => previewShipmentPlan(...args),
}));

const { default: PlatformShippingPanel } = await import("@/app/dashboard/platform-shipping-panel");

const dateRange = { startDate: "2026-08-01", endDate: "2026-08-07" };

function order(id: string, orderNo: string) {
  return {
    id,
    platformCode: "MOMO_MAIN" as const,
    routeId: "MOMO_MAIN:STORE",
    orderNo,
    orderSeqs: [],
    receiverName: "客戶",
    createdAt: "2026-08-01",
    items: [{ name: "保溫瓶", spec: "黑", qty: 1, price: 0 }],
    totalQty: 1,
    logistics: "",
  };
}

function openGroup(orders: ShipmentCandidate[]) {
  return {
    platformCode: "MOMO_MAIN",
    routeId: "MOMO_MAIN:STORE",
    routeLabel: "超商取貨",
    steps: [],
    orders,
    batches: [{ orderNos: orders.map((o) => o.orderNo) }],
    packaging: null,
    blocked: null,
  };
}

function blockedGroup() {
  return {
    platformCode: "MOMO_MAIN",
    routeId: "MOMO_MAIN:THIRD_PARTY",
    routeLabel: "第三方物流",
    steps: [],
    orders: [order("m3", "M3")],
    batches: [],
    packaging: null,
    blocked: "PACKAGING_NOT_CONFIGURED",
  };
}

test("shows route sub-tabs for the active platform only", async () => {
  const momStore = {
    ...openGroup([order("m1", "M1")]),
    routeLabel: "Store route",
  };
  const momoThirdParty = {
    ...blockedGroup(),
    routeLabel: "Third-party route",
  };
  const storeOrder = {
    ...order("s1", "S1"),
    platformCode: "MO_STORE_PLUS" as const,
    routeId: "MO_STORE_PLUS:STORE:1",
  };
  const moStorePlus = {
    ...openGroup([storeOrder]),
    platformCode: "MO_STORE_PLUS" as const,
    routeId: "MO_STORE_PLUS:STORE:1",
    routeLabel: "7-11 route",
  };
  previewShipmentPlan.mockResolvedValue({
    groups: [momStore, momoThirdParty, moStorePlus],
    warnings: [],
    totals: { orderCount: 3, automatableOrderCount: 2 },
    preparedAt: "2026-08-16T00:00:00.000Z",
  });
  const user = userEvent.setup();

  render(<PlatformShippingPanel dateRange={dateRange} refreshToken={1} platformCode="MOMO_MAIN" onDispatch={vi.fn()} />);

  await screen.findByText("Store route");
  assert.equal(screen.getAllByRole("tab").length, 2);
  assert.ok(screen.getByText("M1"));
  assert.equal(screen.queryByText("S1"), null);

  await user.click(screen.getByRole("tab", { name: /Third-party route/ }));
  assert.ok(screen.getByText("M3"));
  assert.equal(screen.queryByText("M1"), null);
});

beforeEach(() => {
  vi.clearAllMocks();
});

test("依路徑分組顯示候選訂單筆數", async () => {
  previewShipmentPlan.mockResolvedValue({
    groups: [openGroup([order("m1", "M1"), order("m2", "M2")])],
    warnings: [],
    totals: { orderCount: 2, automatableOrderCount: 2 },
    preparedAt: "2026-08-16T00:00:00.000Z",
  });

  render(<PlatformShippingPanel dateRange={dateRange} refreshToken={1} onDispatch={vi.fn()} />);

  await waitFor(() => assert.ok(screen.getByText("超商取貨")));
  assert.ok(screen.getByText("2 筆可出貨"));
  assert.ok(screen.getByText("M1"));
  assert.ok(screen.getByText("M2"));
});

test("包材未設定的路徑顯示提示，且勾選框停用", async () => {
  previewShipmentPlan.mockResolvedValue({
    groups: [blockedGroup()],
    warnings: [{ platformCode: "MOMO_MAIN", routeId: "MOMO_MAIN:THIRD_PARTY", scope: "ROUTE", message: "包材尚未設定" }],
    totals: { orderCount: 1, automatableOrderCount: 0 },
    preparedAt: "2026-08-16T00:00:00.000Z",
  });

  render(<PlatformShippingPanel dateRange={dateRange} refreshToken={1} onDispatch={vi.fn()} />);

  await waitFor(() => assert.ok(screen.getByText("包材尚未設定")));
  const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
  assert.ok(checkboxes.every((checkbox) => checkbox.disabled));
});

test("勾選訂單後點擊批次出貨，回報勾選的候選訂單 id", async () => {
  previewShipmentPlan.mockResolvedValue({
    groups: [openGroup([order("m1", "M1"), order("m2", "M2")])],
    warnings: [],
    totals: { orderCount: 2, automatableOrderCount: 2 },
    preparedAt: "2026-08-16T00:00:00.000Z",
  });
  const onDispatch = vi.fn();
  const user = userEvent.setup();

  render(<PlatformShippingPanel dateRange={dateRange} refreshToken={1} onDispatch={onDispatch} />);
  await waitFor(() => assert.ok(screen.getByText("M1")));

  const rowCheckboxes = screen.getAllByRole("checkbox");
  // 第一個是「全選本通路」，其餘為每列的勾選框。
  await user.click(rowCheckboxes[1]);

  await user.click(screen.getByRole("button", { name: /批次出貨/ }));

  assert.deepEqual(onDispatch.mock.calls[0][0], ["m1"]);
});

test("沒有候選訂單時顯示目前沒有資料", async () => {
  previewShipmentPlan.mockResolvedValue({ groups: [], warnings: [], totals: { orderCount: 0, automatableOrderCount: 0 }, preparedAt: "2026-08-16T00:00:00.000Z" });

  render(<PlatformShippingPanel dateRange={dateRange} refreshToken={1} onDispatch={vi.fn()} />);

  await waitFor(() => assert.ok(screen.getByText("沒有待出貨訂單")));
});

test("does not load shipment candidates until the user requests a refresh", () => {
  render(<PlatformShippingPanel dateRange={dateRange} refreshToken={0} onDispatch={vi.fn()} />);

  assert.equal(previewShipmentPlan.mock.calls.length, 0);
});

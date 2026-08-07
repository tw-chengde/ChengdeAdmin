import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PlatformStatus } from "@/app/types/platform";
import { PlatformSettingsProvider } from "@/app/dashboard/platform-settings-context";
import { mockOrders } from "./mocks/orders";

const loadOrdersPageData = vi.fn();
const listPlatformStatuses = vi.fn();

vi.mock("@/app/dashboard/orders-actions", () => ({
  loadOrdersPageData: () => loadOrdersPageData(),
}));

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listPlatformStatuses: () => listPlatformStatuses(),
}));

const { default: OrdersView } = await import("@/app/dashboard/orders-view");

const momoStatus: PlatformStatus = { code: "MOMO_MAIN", name: "MOMO 購物網", logo: "/images/momo.png", enabled: true };
const moStorePlusStatus: PlatformStatus = { code: "MO_STORE_PLUS", name: "Mo 店+", logo: "/images/mo-store.jpg", enabled: true };

beforeEach(() => {
  vi.clearAllMocks();
  loadOrdersPageData.mockResolvedValue(mockOrders);
  listPlatformStatuses.mockResolvedValue([momoStatus, moStorePlusStatus]);
});

async function renderOrders() {
  const user = userEvent.setup();
  render(
    <PlatformSettingsProvider>
      <OrdersView />
    </PlatformSettingsProvider>
  );
  await screen.findByText("全部電商通路");
  return user;
}

test("分頁只顯示啟用中的平台，並帶出該平台的訂單筆數", async () => {
  await renderOrders();

  // 筆數 Chip 在 Tab label 內，會併入分頁的 accessible name。
  const momoCount = mockOrders.filter((o) => o.channelCode === "MOMO_MAIN").length;
  assert.ok(screen.getByRole("tab", { name: new RegExp(`MOMO 購物網\\s*${momoCount}`) }));
  assert.ok(screen.getByRole("tab", { name: /Mo 店\+/ }));

  // 在設定頁停用 Mo 店+ 後，訂單頁不應再出現該分頁。
  cleanup();
  listPlatformStatuses.mockResolvedValue([momoStatus, { ...moStorePlusStatus, enabled: false }]);
  await renderOrders();

  assert.ok(screen.getByRole("tab", { name: /MOMO 購物網/ }));
  assert.equal(screen.queryByRole("tab", { name: /Mo 店\+/ }), null);
});

test("點擊即時同步會重新呼叫 loadOrdersPageData", async () => {
  const user = await renderOrders();

  await user.click(screen.getByRole("button", { name: "即時同步訂單" }));

  await waitFor(() => assert.equal(loadOrdersPageData.mock.calls.length, 2));
});

test("載入訂單失敗時顯示錯誤訊息", async () => {
  loadOrdersPageData.mockRejectedValue(new Error("找不到 D1 binding 'DB'"));
  render(
    <PlatformSettingsProvider>
      <OrdersView />
    </PlatformSettingsProvider>
  );

  assert.ok(await screen.findByText("找不到 D1 binding 'DB'"));
});

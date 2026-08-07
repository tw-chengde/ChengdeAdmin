import { render, screen } from "@testing-library/react";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PlatformStatus } from "@/app/types/platform";
import { PlatformSettingsProvider } from "@/app/dashboard/platform-settings-context";

const listPlatformStatuses = vi.fn();

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listPlatformStatuses: () => listPlatformStatuses(),
}));

const { default: OrderMergeView } = await import("@/app/dashboard/order-merge-view");

const momoStatus: PlatformStatus = { code: "MOMO_MAIN", name: "MOMO 購物網", logo: "/images/momo.png", enabled: true };
const moStorePlusStatus: PlatformStatus = { code: "MO_STORE_PLUS", name: "Mo 店+", logo: "/images/mo-store.jpg", enabled: true };

beforeEach(() => {
  vi.clearAllMocks();
  listPlatformStatuses.mockResolvedValue([momoStatus, moStorePlusStatus]);
});

function renderMergeView() {
  return render(
    <PlatformSettingsProvider>
      <OrderMergeView />
    </PlatformSettingsProvider>
  );
}

test("載入後依啟用中的平台顯示對應的通路分頁", async () => {
  renderMergeView();

  assert.ok(await screen.findByRole("tab", { name: /MOMO 購物網/ }));
  assert.ok(screen.getByRole("tab", { name: /Mo 店\+/ }));
});

test("只剩一個平台啟用時，只顯示該平台的通路分頁與商品", async () => {
  listPlatformStatuses.mockResolvedValue([momoStatus, { ...moStorePlusStatus, enabled: false }]);
  renderMergeView();

  assert.ok(await screen.findByRole("tab", { name: /MOMO 購物網/ }));
  assert.equal(screen.queryByRole("tab", { name: /Mo 店\+/ }), null);
  assert.equal(screen.queryByText("極簡質感無段調節護眼檯燈"), null);
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { PlatformSettingsProvider } from "@/app/dashboard/platform-settings-context";

const listPlatformStatuses = vi.fn();
const refreshWorkspace = vi.fn();
const previewShipment = vi.fn();

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listPlatformStatuses: () => listPlatformStatuses(),
}));

vi.mock("@/app/hooks/useShippingWorkspace", () => ({
  useShippingWorkspace: () => ({
    dateRange: { startDate: "2026-08-01", endDate: "2026-08-07" },
    setDateRange: vi.fn(),
    workspace: { orders: [], bindings: [], products: [], failures: [] },
    pickingSheet: { totals: { totalQty: 0 } },
    loading: false,
    hasLoaded: true,
    loadError: null,
    refresh: refreshWorkspace,
  }),
}));

vi.mock("@/app/hooks/useOneClickShipment", () => ({
  useOneClickShipment: () => ({ preview: previewShipment }),
}));

vi.mock("@/app/dashboard/platform-shipping-panel", () => ({
  default: ({ platformCode, refreshToken }: { platformCode?: string; refreshToken: number }) => (
    <div>{`selected:${platformCode};refresh:${refreshToken}`}</div>
  ),
}));

vi.mock("@/app/dashboard/picking-sheet-dialog", () => ({ default: () => null }));
vi.mock("@/app/dashboard/shipping-dispatch-dialog", () => ({ default: () => null }));
vi.mock("@/app/dashboard/loading-backdrop", () => ({ default: () => null }));

const { default: ShippingView } = await import("@/app/dashboard/shipping-view");

beforeEach(() => {
  vi.clearAllMocks();
  listPlatformStatuses.mockResolvedValue([
    { code: "MOMO_MAIN", name: "MOMO", logo: "/images/momo.png", enabled: true },
    { code: "MO_STORE_PLUS", name: "Mo Store", logo: "/images/mo-store.jpg", enabled: true },
  ]);
});

test("renders enabled platform tabs and passes the selected platform to its route workspace", async () => {
  const user = userEvent.setup();
  render(
    <PlatformSettingsProvider>
      <ShippingView />
    </PlatformSettingsProvider>,
  );

  const tabs = await screen.findAllByRole("tab");
  assert.equal(tabs.length, 2);
  assert.ok(screen.getByText("selected:MOMO_MAIN;refresh:0"));

  await user.click(tabs[1]!);
  assert.ok(screen.getByText("selected:MO_STORE_PLUS;refresh:0"));
});

test("query pending shipments refreshes the shared picking-sheet and shipment-candidate source", async () => {
  const user = userEvent.setup();
  render(
    <PlatformSettingsProvider>
      <ShippingView />
    </PlatformSettingsProvider>,
  );

  await user.click(await screen.findByRole("button", { name: "查詢待出貨訂單" }));

  assert.equal(refreshWorkspace.mock.calls.length, 1);
  assert.ok(screen.getByText("selected:MOMO_MAIN;refresh:1"));
});

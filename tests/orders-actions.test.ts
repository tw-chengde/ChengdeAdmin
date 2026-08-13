import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const getConnector = vi.fn();
const listEnabledPlatformCodes = vi.fn();

vi.mock("@/app/lib/platforms/registry", () => ({
  getConnector: (code: unknown) => getConnector(code),
}));
vi.mock("@/app/dashboard/platforms-actions", () => ({
  listEnabledPlatformCodes: () => listEnabledPlatformCodes(),
}));

const { loadOrdersPageData } = await import("@/app/dashboard/orders-actions");

const dateRange = { startDate: "2026-08-01", endDate: "2026-08-07" };

beforeEach(() => {
  vi.clearAllMocks();
  listEnabledPlatformCodes.mockResolvedValue(["MOMO_MAIN"]);
});

test("loadOrdersPageData skips a disabled selected platform", async () => {
  listEnabledPlatformCodes.mockResolvedValue([]);

  assert.deepEqual(await loadOrdersPageData(dateRange, "MOMO_MAIN"), []);
  assert.equal(getConnector.mock.calls.length, 0);
});

test("loadOrdersPageData uses the selected enabled connector and normalized dates", async () => {
  const fetchOrders = vi.fn().mockResolvedValue([{ id: "momo-1" }]);
  getConnector.mockReturnValue({ fetchOrders });

  const result = await loadOrdersPageData(dateRange, "MOMO_MAIN", "SHIPPING");

  assert.deepEqual(result, [{ id: "momo-1" }]);
  const query = fetchOrders.mock.calls[0][0];
  assert.equal(query.from.toISOString(), "2026-07-31T16:00:00.000Z");
  assert.equal(query.to.toISOString(), "2026-08-07T15:59:59.999Z");
  assert.equal(query.status, "SHIPPING");
});

test("loadOrdersPageData returns no data for an unknown selected connector", async () => {
  getConnector.mockReturnValue(undefined);

  assert.deepEqual(await loadOrdersPageData(dateRange, "MOMO_MAIN"), []);
});
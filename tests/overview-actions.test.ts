import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import type { PlatformConnector } from "@/app/lib/platforms/connector";
import { momoDefinition, moStorePlusDefinition } from "@/app/lib/platforms/definitions";
import type { PlatformSalesQuery, PlatformSalesStatistics } from "@/app/lib/platforms/sales";
import type { PlatformCode, PlatformDefinition } from "@/app/lib/platforms/types";

const listEnabledPlatformCodesMock = vi.fn<() => Promise<PlatformCode[]>>();
const getConnectorMock = vi.fn<(code: PlatformCode) => PlatformConnector | undefined>();
const getAllPlatformDefinitionsMock = vi.fn();

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listEnabledPlatformCodes: () => listEnabledPlatformCodesMock(),
}));

vi.mock("@/app/lib/platforms/registry", () => ({
  getConnector: (code: PlatformCode) => getConnectorMock(code),
}));

vi.mock("@/app/lib/platforms/definitions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/platforms/definitions")>();
  return {
    ...actual,
    getAllPlatformDefinitions: () => getAllPlatformDefinitionsMock(),
  };
});

const { loadOverviewData } = await import("@/app/dashboard/overview-actions");

function statsOf(revenue: number, orderCount: number, daily: PlatformSalesStatistics["daily"] = []) {
  return { revenue, orderCount, returnCount: 0, daily };
}

/** 依查詢區間回傳不同統計，才驗得出 action 有把三個區間分別問過。 */
function connectorWith(
  definition: PlatformDefinition,
  byRange: Record<string, PlatformSalesStatistics>,
  pendingShipmentCount = 0,
) {
  const fetchSalesStatistics = vi.fn(async (query: PlatformSalesQuery) => {
    const key = `${query.from.toISOString().slice(0, 10)}~${query.to.toISOString().slice(0, 10)}`;
    return byRange[key] ?? statsOf(0, 0);
  });
  const fetchPendingShipmentCount = vi.fn(async () => pendingShipmentCount);
  const connector: PlatformConnector = {
    definition,
    fetchOrders: vi.fn().mockResolvedValue([]),
    fetchPickingSheetOrders: vi.fn().mockResolvedValue([]),
    fetchProducts: vi.fn().mockResolvedValue([]),
    fetchSalesStatistics,
    fetchPendingShipmentCount,
  };
  return { connector, fetchSalesStatistics, fetchPendingShipmentCount };
}

beforeEach(() => {
  vi.clearAllMocks();
  // 只假造 Date，避免動到 timer 影響 await 的排程。
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-14T10:00:00+08:00"));
  getAllPlatformDefinitionsMock.mockReturnValue([momoDefinition, moStorePlusDefinition]);
});

afterEach(() => {
  vi.useRealTimers();
});

/** 台北時區 2026-08-14 當下的三個查詢區間，以 UTC 日期表示（區間起點 00:00+08:00 落在前一天 UTC）。 */
const currentMonthKey = "2026-07-31~2026-08-14";
const lastMonthKey = "2026-06-30~2026-07-31";
const lastSamePeriodKey = "2026-06-30~2026-07-14";

test("loadOverviewData 向每個已啟用平台問三個區間的銷售統計並彙總", async () => {
  listEnabledPlatformCodesMock.mockResolvedValue(["MOMO_MAIN", "MO_STORE_PLUS"]);

  const momo = connectorWith(
    momoDefinition,
    {
      [currentMonthKey]: statsOf(3000, 3),
      [lastMonthKey]: statsOf(2000, 2),
      [lastSamePeriodKey]: statsOf(1000, 1),
    },
    4,
  );
  const moStorePlus = connectorWith(moStorePlusDefinition, {
    [currentMonthKey]: statsOf(2000, 1, [{ date: "2026-08-02", revenue: 2000, orderCount: 1 }]),
  });

  getConnectorMock.mockImplementation((code) => {
    if (code === "MOMO_MAIN") return momo.connector;
    if (code === "MO_STORE_PLUS") return moStorePlus.connector;
    return undefined;
  });

  const metrics = await loadOverviewData();

  assert.equal(metrics.currentMonthRevenue, 5000);
  assert.equal(metrics.currentMonthOrders, 4);
  assert.equal(metrics.lastMonthRevenue, 2000);
  assert.equal(metrics.lastMonthSamePeriodRevenue, 1000);
  assert.equal(metrics.platformStats.length, 2);
  assert.equal(metrics.pendingShipments, 4);
  assert.equal(momo.fetchSalesStatistics.mock.calls.length, 3);
  // 待出貨是當下的營運狀態，只問當月一次。
  assert.equal(momo.fetchPendingShipmentCount.mock.calls.length, 1);
});

test("loadOverviewData skips disabled platforms", async () => {
  listEnabledPlatformCodesMock.mockResolvedValue(["MOMO_MAIN"]);

  const momo = connectorWith(momoDefinition, {});
  getConnectorMock.mockImplementation((code) => (code === "MOMO_MAIN" ? momo.connector : undefined));

  const metrics = await loadOverviewData();
  assert.equal(metrics.platformStats.length, 1);
  assert.equal(metrics.platformStats[0]?.code, "MOMO_MAIN");
});

// 一個平台的 API 掛掉時，總覽仍要顯示其他平台的數字，而不是整頁失敗。
test("loadOverviewData 在單一平台查詢失敗時以零值代入", async () => {
  listEnabledPlatformCodesMock.mockResolvedValue(["MOMO_MAIN", "MO_STORE_PLUS"]);

  const failing: PlatformConnector = {
    definition: momoDefinition,
    fetchOrders: vi.fn().mockResolvedValue([]),
    fetchPickingSheetOrders: vi.fn().mockResolvedValue([]),
    fetchProducts: vi.fn().mockResolvedValue([]),
    fetchSalesStatistics: vi.fn().mockRejectedValue(new Error("momo SCM 憑證錯誤")),
    fetchPendingShipmentCount: vi.fn().mockRejectedValue(new Error("momo SCM 憑證錯誤")),
  };
  const working = connectorWith(moStorePlusDefinition, { [currentMonthKey]: statsOf(1200, 2) });

  getConnectorMock.mockImplementation((code) => (code === "MOMO_MAIN" ? failing : working.connector));

  const metrics = await loadOverviewData();

  assert.equal(metrics.currentMonthRevenue, 1200);
  assert.equal(metrics.platformStats.find((s) => s.code === "MOMO_MAIN")?.currentMonthRevenue, 0);
  assert.equal(metrics.pendingShipments, 0);
});

import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PlatformConnector } from "@/app/lib/platforms/connector";
import { momoDefinition, moStorePlusDefinition } from "@/app/lib/platforms/definitions";
import type { PlatformCode } from "@/app/lib/platforms/types";
import type { OrderItem } from "@/app/types/order";

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

beforeEach(() => {
  vi.clearAllMocks();
  getAllPlatformDefinitionsMock.mockReturnValue([momoDefinition, moStorePlusDefinition]);
});

test("loadOverviewData queries enabled platforms and computes overview metrics", async () => {
  listEnabledPlatformCodesMock.mockResolvedValue(["MOMO_MAIN", "MO_STORE_PLUS"]);

  const mockMomoOrders: OrderItem[] = [
    {
      id: "momo:1",
      channel: "MOMO 購物網",
      channelCode: "MOMO_MAIN",
      orderNo: "MO-1",
      customerName: "顧客A",
      address: "台北",
      items: [],
      totalAmount: 3000,
      status: "待發貨",
      logistics: "宅配",
      trackingNo: "T1",
      createdAt: "2026-08-01 12:00",
    },
  ];

  const mockMoStoreOrders: OrderItem[] = [
    {
      id: "mo-store-plus:1",
      channel: "Mo 店+",
      channelCode: "MO_STORE_PLUS",
      orderNo: "MS-1",
      customerName: "顧客B",
      address: "新北",
      items: [],
      totalAmount: 2000,
      status: "已完成",
      logistics: "超取",
      trackingNo: "T2",
      createdAt: "2026-08-02 12:00",
    },
  ];

  const momoConnector: PlatformConnector = {
    definition: momoDefinition,
    fetchOrders: vi.fn().mockResolvedValue(mockMomoOrders),
    fetchProducts: vi.fn().mockResolvedValue([]),
  };

  const moStorePlusConnector: PlatformConnector = {
    definition: moStorePlusDefinition,
    fetchOrders: vi.fn().mockResolvedValue(mockMoStoreOrders),
    fetchProducts: vi.fn().mockResolvedValue([]),
  };

  getConnectorMock.mockImplementation((code) => {
    if (code === "MOMO_MAIN") return momoConnector;
    if (code === "MO_STORE_PLUS") return moStorePlusConnector;
    return undefined;
  });

  const metrics = await loadOverviewData();

  // 當月加總營收：3000 + 2000 = 5000
  assert.equal(metrics.currentMonthRevenue, 5000);
  assert.equal(metrics.currentMonthOrders, 2);
  assert.equal(metrics.platformStats.length, 2);
});

test("loadOverviewData skips disabled platforms", async () => {
  // 僅啟用 MOMO
  listEnabledPlatformCodesMock.mockResolvedValue(["MOMO_MAIN"]);

  const momoConnector: PlatformConnector = {
    definition: momoDefinition,
    fetchOrders: vi.fn().mockResolvedValue([]),
    fetchProducts: vi.fn().mockResolvedValue([]),
  };

  getConnectorMock.mockImplementation((code) => {
    if (code === "MOMO_MAIN") return momoConnector;
    return undefined;
  });

  const metrics = await loadOverviewData();
  assert.equal(metrics.platformStats.length, 1);
  assert.equal(metrics.platformStats[0]?.code, "MOMO_MAIN");
});

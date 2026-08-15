import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { OverviewMetrics } from "@/app/utils/overview";

const loadOverviewData = vi.fn();

vi.mock("@/app/dashboard/overview-actions", () => ({
  loadOverviewData: () => loadOverviewData(),
}));

const { default: OverviewView } = await import("@/app/dashboard/overview-view");

const mockMetrics: OverviewMetrics = {
  currentMonthRevenue: 125000,
  lastMonthRevenue: 98000,
  lastMonthSamePeriodRevenue: 85000,
  currentMonthOrders: 65,
  lastMonthOrders: 52,
  currentMonthAov: 1923,
  lastMonthAov: 1885,
  revenueGrowthRate: 47.1,
  ordersGrowthRate: 25.0,
  pendingShipments: 4,
  rmaCount: 1,
  platformStats: [
    {
      code: "MOMO_MAIN",
      name: "MOMO 購物網",
      logo: "/images/momo.png",
      logoObjectFit: "contain",
      color: "#ec008c",
      bgcolor: "rgba(236, 0, 140, 0.08)",
      borderColor: "rgba(236, 0, 140, 0.25)",
      currentMonthRevenue: 85000,
      lastMonthRevenue: 60000,
      currentMonthOrders: 40,
      lastMonthOrders: 32,
      currentMonthAov: 2125,
      lastMonthAov: 1875,
      sharePercentage: 68.0,
      pendingShipment: 3,
    },
    {
      code: "MO_STORE_PLUS",
      name: "Mo 店+",
      logo: "/images/mo-store.jpg",
      logoObjectFit: "cover",
      color: "#2b4885",
      bgcolor: "rgba(43, 72, 133, 0.08)",
      borderColor: "rgba(43, 72, 133, 0.25)",
      currentMonthRevenue: 40000,
      lastMonthRevenue: 38000,
      currentMonthOrders: 25,
      lastMonthOrders: 20,
      currentMonthAov: 1600,
      lastMonthAov: 1900,
      sharePercentage: 32.0,
      pendingShipment: 1,
    },
  ],
  dailyTrends: [
    { date: "2026-08-01", label: "8/1", day: 1, revenue: 15000, orderCount: 8, cumulativeRevenue: 15000 },
    { date: "2026-08-02", label: "8/2", day: 2, revenue: 20000, orderCount: 10, cumulativeRevenue: 35000 },
  ],
  currentMonthLabel: "8月迄今",
  lastMonthLabel: "7月全月",
};

beforeEach(() => {
  vi.clearAllMocks();
  loadOverviewData.mockResolvedValue(mockMetrics);
});

test("renders overview dashboard with revenue metrics and platform breakdown", async () => {
  render(<OverviewView />);

  // 檢查頂部標題
  assert.ok(await screen.findByText("營運總覽"));

  // 檢查當月總業績與上月總業績
  assert.ok(await screen.findByText("NT$ 125,000"));
  assert.ok(await screen.findByText("NT$ 98,000"));

  // 檢查成長率與訂單數
  assert.ok(await screen.findByText("+47.1% vs 上月同期"));
  assert.ok(await screen.findByText("65"));
  assert.ok(await screen.findByText("NT$ 1,923"));

  // 檢查平台拆解與佔比
  assert.ok(await screen.findByText("MOMO 購物網"));
  assert.ok(await screen.findByText("NT$ 85,000"));
  assert.ok(await screen.findByText("68%"));

  assert.ok(await screen.findByText("Mo 店+"));
  assert.ok(await screen.findByText("NT$ 40,000"));
  assert.ok(await screen.findByText("32%"));
});

test("allows reloading data when clicking the refresh button", async () => {
  const user = userEvent.setup();
  render(<OverviewView />);

  await screen.findByText("NT$ 125,000");
  assert.equal(loadOverviewData.mock.calls.length, 1);

  const refreshButton = screen.getByRole("button", { name: "重新整理" });
  await user.click(refreshButton);

  await waitFor(() => assert.equal(loadOverviewData.mock.calls.length, 2));
});

test("displays error alert if loadOverviewData fails", async () => {
  loadOverviewData.mockRejectedValue(new Error("API 連線逾時"));
  render(<OverviewView />);

  assert.ok(await screen.findByText("API 連線逾時"));
});

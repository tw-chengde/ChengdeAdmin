"use server";

import { getAllPlatformDefinitions } from "@/app/lib/platforms/definitions";
import { getConnector } from "@/app/lib/platforms/registry";
import type { OrderItem } from "@/app/types/order";
import {
  calculateOverviewMetrics,
  getOverviewDateRanges,
  type OverviewMetrics,
} from "@/app/utils/overview";
import { listEnabledPlatformCodes } from "./platforms-actions";

/**
 * 載入營運總覽跨平台指標數據（當月迄今總業績、上月總業績、客單價、成長率、趨勢）。
 */
export async function loadOverviewData(): Promise<OverviewMetrics> {
  const ranges = getOverviewDateRanges();
  const enabledCodes = await listEnabledPlatformCodes();
  const allDefinitions = getAllPlatformDefinitions();
  const enabledDefinitions = allDefinitions.filter((def) => enabledCodes.includes(def.code));

  // 並行抓取所有已啟用平台的當月與上月訂單
  const platformOrderPromises = enabledDefinitions.map(async (def) => {
    const connector = getConnector(def.code);
    if (!connector) {
      return { currentOrders: [] as OrderItem[], lastOrders: [] as OrderItem[], lastSamePeriodOrders: [] as OrderItem[] };
    }

    const [currentOrders, lastOrders, lastSamePeriodOrders] = await Promise.all([
      connector
        .fetchOrders({
          from: ranges.currentMonth.from,
          to: ranges.currentMonth.to,
          status: "STATISTICS",
          deliveryType: "All",
          storeDeliveryType: "All",
          shippingStatus: "All",
        })
        .catch(() => [] as OrderItem[]),
      connector
        .fetchOrders({
          from: ranges.lastMonth.from,
          to: ranges.lastMonth.to,
          status: "STATISTICS",
          deliveryType: "All",
          storeDeliveryType: "All",
          shippingStatus: "All",
        })
        .catch(() => [] as OrderItem[]),
      connector
        .fetchOrders({
          from: ranges.lastMonthSamePeriod.from,
          to: ranges.lastMonthSamePeriod.to,
          status: "STATISTICS",
          deliveryType: "All",
          storeDeliveryType: "All",
          shippingStatus: "All",
        })
        .catch(() => [] as OrderItem[]),
    ]);

    return { currentOrders, lastOrders, lastSamePeriodOrders };
  });

  const platformResults = await Promise.all(platformOrderPromises);

  const allCurrentOrders = platformResults.flatMap((r) => r.currentOrders);
  const allLastOrders = platformResults.flatMap((r) => r.lastOrders);
  const allLastSamePeriodOrders = platformResults.flatMap((r) => r.lastSamePeriodOrders);

  return calculateOverviewMetrics(allCurrentOrders, allLastOrders, enabledDefinitions, ranges, allLastSamePeriodOrders);
}

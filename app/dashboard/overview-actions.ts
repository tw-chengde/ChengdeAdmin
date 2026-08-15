"use server";

import { getAllPlatformDefinitions } from "@/app/lib/platforms/definitions";
import { getConnector } from "@/app/lib/platforms/registry";
import { emptySalesStatistics, type PlatformSalesQuery } from "@/app/lib/platforms/sales";
import {
  calculateOverviewMetrics,
  getOverviewDateRanges,
  type OverviewMetrics,
  type PlatformOverviewInput,
} from "@/app/utils/overview";
import { listEnabledPlatformCodes } from "./platforms-actions";

/**
 * 載入營運總覽跨平台指標數據（當月迄今總業績、上月總業績、客單價、成長率、趨勢）。
 *
 * 單一平台查詢失敗時以零值代入，總覽才不會因為一個平台的憑證或連線問題整頁掛掉。
 */
export async function loadOverviewData(): Promise<OverviewMetrics> {
  const ranges = getOverviewDateRanges();
  const enabledCodes = await listEnabledPlatformCodes();
  const enabledDefinitions = getAllPlatformDefinitions().filter((def) => enabledCodes.includes(def.code));

  const platformInputs = await Promise.all(
    enabledDefinitions.map(async (definition): Promise<PlatformOverviewInput> => {
      const connector = getConnector(definition.code);
      if (!connector) {
        return {
          definition,
          currentMonth: emptySalesStatistics(),
          lastMonth: emptySalesStatistics(),
          lastMonthSamePeriod: emptySalesStatistics(),
          pendingShipmentCount: 0,
        };
      }

      const salesOf = (range: PlatformSalesQuery) =>
        connector.fetchSalesStatistics(range).catch(() => emptySalesStatistics());

      const [currentMonth, lastMonth, lastMonthSamePeriod, pendingShipmentCount] = await Promise.all([
        salesOf(ranges.currentMonth),
        salesOf(ranges.lastMonth),
        salesOf(ranges.lastMonthSamePeriod),
        connector.fetchPendingShipmentCount(ranges.currentMonth).catch(() => 0),
      ]);

      return { definition, currentMonth, lastMonth, lastMonthSamePeriod, pendingShipmentCount };
    }),
  );

  return calculateOverviewMetrics(platformInputs, ranges);
}

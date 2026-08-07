"use server";

import { getEnabledConnectors } from "@/app/lib/platforms/registry";
import type { OrderItem } from "@/app/types/order";
import { listEnabledPlatformCodes } from "./platforms-actions";

/** 依目前啟用中的平台抓取並合併訂單。之後串接真實 API 時，這裡的邏輯不需更動。
 *  哪些平台啟用一律以 D1 為準（不信任前端快取），因此仍在此重新查詢一次。 */
export async function loadOrdersPageData(): Promise<OrderItem[]> {
  const enabledCodes = await listEnabledPlatformCodes();
  const connectors = getEnabledConnectors(enabledCodes);
  const orderLists = await Promise.all(connectors.map((c) => c.fetchOrders()));
  return orderLists.flat();
}

"use server";

import { getConnector } from "@/app/lib/platforms/registry";
import type { PlatformCode } from "@/app/lib/platforms/types";
import type { OrderItem } from "@/app/types/order";
import { resolveOrderDateRange, type OrderDateRange } from "@/app/utils/orders";
import { listEnabledPlatformCodes } from "./platforms-actions";

export type { OrderDateRange };

export interface OrderPageFilters {
  status?: string;
  deliveryType?: string;
  storeDeliveryType?: string;
  shippingStatus?: string;
}

/** Loads orders for one enabled platform only. */
export async function loadOrdersPageData(
  dateRange: OrderDateRange,
  channelCode: PlatformCode,
  filters: OrderPageFilters = {},
): Promise<OrderItem[]> {
  const {
    status = "ALL",
    deliveryType = "All",
    storeDeliveryType = "All",
    shippingStatus = "All",
  } = filters;
  const { from, to } = resolveOrderDateRange(dateRange);
  const enabledCodes = await listEnabledPlatformCodes();

  if (!enabledCodes.includes(channelCode)) return [];

  const connector = getConnector(channelCode);
  if (!connector) return [];

  return connector.fetchOrders({
    from,
    to,
    status,
    deliveryType,
    storeDeliveryType,
    shippingStatus,
  });
}

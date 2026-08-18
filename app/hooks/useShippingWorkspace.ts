"use client";

import { useCallback, useMemo, useState } from "react";
import { loadShipmentWorkspace, type ShipmentWorkspaceData } from "@/app/dashboard/shipping-actions";
import type { PickingSheet } from "@/app/types/picking";
import { errorMessage } from "@/app/utils/errors";
import { getDefaultDateRange, type OrderDateRange } from "@/app/utils/orders";
import { buildPickingSheet } from "@/app/utils/picking";
import { useLatestRequest } from "./useLatestRequest";

const emptyWorkspace: ShipmentWorkspaceData = { orders: [], bindings: [], products: [], failures: [] };

export interface ShippingWorkspace {
  dateRange: OrderDateRange;
  setDateRange: (range: OrderDateRange) => void;
  workspace: ShipmentWorkspaceData;
  pickingSheet: PickingSheet;
  loading: boolean;
  hasLoaded: boolean;
  loadError: string | null;
  refresh: () => void;
}

/**
 * Holds the picking-sheet workspace. Queries are user initiated so entering
 * the shipping page does not make platform API calls.
 */
export function useShippingWorkspace(): ShippingWorkspace {
  const [dateRange, setDateRange] = useState<OrderDateRange>(getDefaultDateRange);
  const [workspace, setWorkspace] = useState<ShipmentWorkspaceData>(emptyWorkspace);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const runLatest = useLatestRequest();

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    runLatest(() => loadShipmentWorkspace(dateRange), {
      onSuccess: (data) => {
        setWorkspace(data);
        setHasLoaded(true);
      },
      onError: (error) => setLoadError(errorMessage(error, "讀取出貨工作區失敗")),
      onSettled: () => setLoading(false),
    });
  }, [dateRange, runLatest]);

  const pickingSheet = useMemo(
    () => buildPickingSheet(workspace.orders, workspace.bindings, workspace.products),
    [workspace.orders, workspace.bindings, workspace.products],
  );

  return { dateRange, setDateRange, workspace, pickingSheet, loading, hasLoaded, loadError, refresh };
}

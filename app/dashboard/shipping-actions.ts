"use server";

import type { PlatformConnector } from "@/app/lib/platforms/connector";
import { shipmentPackagingFromEnvironment } from "@/app/lib/platforms/config";
import { getAllPlatformDefinitions } from "@/app/lib/platforms/definitions";
import { getConnector, getEnabledConnectors } from "@/app/lib/platforms/registry";
import type { PlatformCode } from "@/app/lib/platforms/types";
import type { OrderItem } from "@/app/types/order";
import type { Product } from "@/app/types/product";
import type { PlatformFetchFailure, ProductBinding } from "@/app/types/product-binding";
import type { ShipRouteId, ShipmentBatchResult, ShipmentPackaging, ShipmentPlan } from "@/app/types/shipment";
import { resolveOrderDateRange, type OrderDateRange } from "@/app/utils/orders";
import { buildShipmentPlan, diffCandidates, type ShipRouteMeta } from "@/app/utils/shipment";
import { listProductBindings } from "./merge-actions";
import { listEnabledPlatformCodes } from "./platforms-actions";
import { listProducts } from "./products-actions";

export type { OrderDateRange };

export interface ShipmentWorkspaceData {
  orders: OrderItem[];
  bindings: ProductBinding[];
  products: Product[];
  /** 單一平台查詢失敗不讓整頁空白；其他平台的訂單仍照常顯示。 */
  failures: PlatformFetchFailure[];
}

interface PlatformOrdersResult {
  orders: OrderItem[];
  failures: PlatformFetchFailure[];
}

/** 單一平台查詢失敗刻意不往外拋，與 merge-actions.ts 的 fetchPlatformProducts 同一模式。 */
async function fetchPlatformOrders(connector: PlatformConnector, from: Date, to: Date): Promise<PlatformOrdersResult> {
  try {
    return { orders: await connector.fetchPickingSheetOrders({ from, to }), failures: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { orders: [], failures: [{ platformCode: connector.definition.code, message }] };
  }
}

/**
 * 出貨管理頁一次載入所需的全部資料：所有已啟用平台在查詢區間內可出貨的訂單、綁定與本地商品。
 *
 * 各 connector 以平台原生的「未處理／可出貨」條件查詢；正規化後的「待發貨」
 * 由 `buildPickingSheet` 篩選，這裡不用猜各平台的原生狀態值。
 */
// Each connector selects its platform-specific unprocessed-order API/status before this workspace combines the results.
export async function loadShipmentWorkspace(dateRange: OrderDateRange): Promise<ShipmentWorkspaceData> {
  const { from, to } = resolveOrderDateRange(dateRange);
  const enabledCodes = await listEnabledPlatformCodes();
  const connectors = getEnabledConnectors(enabledCodes);

  const [orderResults, bindings, products] = await Promise.all([
    Promise.all(connectors.map((connector) => fetchPlatformOrders(connector, from, to))),
    listProductBindings(),
    listProducts(),
  ]);

  return {
    orders: orderResults.flatMap((result) => result.orders),
    bindings,
    products,
    failures: orderResults.flatMap((result) => result.failures),
  };
}

/** momo 出貨用包材的環境變數前綴；目前只有 momo 的路徑 `requiresPackaging`。 */
const MOMO_PACKAGING_ENV_PREFIX = "MOMO_SCM";

/** 彙整所有已知平台的 `shipRoutes` 中繼資料，供 `buildShipmentPlan` 分組使用。 */
function shipRouteMetadata(): { routes: Map<ShipRouteId, ShipRouteMeta>; packagingByRoute: Map<ShipRouteId, ShipmentPackaging | null> } {
  const routes = new Map<ShipRouteId, ShipRouteMeta>();
  const packagingByRoute = new Map<ShipRouteId, ShipmentPackaging | null>();
  const momoPackaging = shipmentPackagingFromEnvironment(MOMO_PACKAGING_ENV_PREFIX);

  for (const definition of getAllPlatformDefinitions()) {
    for (const route of definition.shipRoutes ?? []) {
      routes.set(route.id, { label: route.label, steps: route.steps, requiresPackaging: route.requiresPackaging });
      packagingByRoute.set(route.id, route.requiresPackaging ? momoPackaging : null);
    }
  }
  return { routes, packagingByRoute };
}

/** 查詢區間內、所有支援一鍵出貨的已啟用平台的候選訂單。未實作 `fetchShipmentCandidates` 的平台自然被跳過。 */
interface ShipmentCandidateFetchFailure {
  platformCode: PlatformCode;
  message: string;
}

async function fetchAllShipmentCandidates(
  dateRange: OrderDateRange,
): Promise<{ candidates: import("@/app/types/shipment").ShipmentCandidate[]; failures: ShipmentCandidateFetchFailure[] }> {
  const { from, to } = resolveOrderDateRange(dateRange);
  const enabledCodes = await listEnabledPlatformCodes();
  const connectors = getEnabledConnectors(enabledCodes).filter(
    (connector): connector is PlatformConnector & Required<Pick<PlatformConnector, "fetchShipmentCandidates">> =>
      typeof connector.fetchShipmentCandidates === "function",
  );
  const settled = await Promise.allSettled(connectors.map((connector) => connector.fetchShipmentCandidates({ from, to })));
  const candidates: import("@/app/types/shipment").ShipmentCandidate[] = [];
  const failures: ShipmentCandidateFetchFailure[] = [];

  for (const [index, result] of settled.entries()) {
    const connector = connectors[index]!;
    if (result.status === "fulfilled") {
      candidates.push(...result.value);
    } else {
      failures.push({
        platformCode: connector.definition.code,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  return { candidates, failures };
}

/**
 * 預覽出貨計畫：查全部候選訂單（或只查 `selectedIds` 指定的那些），依路徑分組並附上
 * 每組的步驟、批次與是否被擋下（目前僅 momo 包材未設定會擋）。
 */
export async function previewShipmentPlan(dateRange: OrderDateRange, selectedIds?: string[]): Promise<ShipmentPlan> {
  const { candidates: allCandidates, failures } = await fetchAllShipmentCandidates(dateRange);
  const candidates = selectedIds ? allCandidates.filter((candidate) => selectedIds.includes(candidate.id)) : allCandidates;
  const { routes, packagingByRoute } = shipRouteMetadata();
  const plan = buildShipmentPlan({ candidates, routes, packagingByRoute });
  return {
    ...plan,
    warnings: [
      ...plan.warnings,
      ...failures.map((failure) => ({
        platformCode: failure.platformCode,
        routeId: failure.platformCode,
        scope: "PLATFORM" as const,
        message: `${failure.platformCode} 候選訂單讀取失敗：${failure.message}`,
      })),
    ],
  };
}

/**
 * 確認出貨計畫前重新查一次候選訂單（甲配每分鐘轉單，預覽與確認之間可能已經變動），
 * 回報與預覽時的落差：`removed` 是預覽時有、現在查不到的（多半已被平台取消或出貨完成）；
 * `added` 是預覽之後才出現的新訂單，只提示不自動納入。
 */
export async function confirmShipmentPlan(
  dateRange: OrderDateRange,
  orderIds: string[],
): Promise<{ plan: ShipmentPlan; drift: { added: string[]; removed: string[] } }> {
  const { candidates: freshCandidates, failures } = await fetchAllShipmentCandidates(dateRange);
  const selectedPlatformCodes = new Set(orderIds.map((id) => id.split(":")[0]));
  const selectedFailures = failures.filter((failure) => selectedPlatformCodes.has(failure.platformCode));
  if (selectedFailures.length > 0) {
    throw new Error(selectedFailures.map((failure) => `${failure.platformCode} 候選訂單讀取失敗：${failure.message}`).join("\n"));
  }
  const plannedIds = new Set(orderIds);
  const drift = diffCandidates(orderIds, freshCandidates);

  const confirmedCandidates = freshCandidates.filter((candidate) => plannedIds.has(candidate.id));
  const { routes, packagingByRoute } = shipRouteMetadata();
  const plan = buildShipmentPlan({ candidates: confirmedCandidates, routes, packagingByRoute });

  return { plan, drift };
}

export interface ExecuteShipmentBatchInput {
  dateRange: OrderDateRange;
  platformCode: PlatformCode;
  routeId: ShipRouteId;
  orderNos: string[];
}

function skippedBatchResult(routeId: ShipRouteId, orderNos: string[]): ShipmentBatchResult {
  return { routeId, results: orderNos.map((orderNo) => ({ orderNo, state: "SKIPPED" })), documents: [] };
}

/**
 * 執行同一平台、同一路徑的整組出貨。
 *
 * 每次呼叫都是獨立的 server action；不同平台或路徑仍分開執行，避免混用不同平台的
 * 出貨 API 與列印格式。
 *
 * server 端不信任 client 傳來的 routeId：路徑不存在、不可自動化，或需要包材但未設定，
 * 一律回 SKIPPED 而不是照做；connector 整批 throw 時捕捉成全 FAILED，避免整頁炸掉。
 */
export async function executeShipmentBatch(input: ExecuteShipmentBatchInput): Promise<ShipmentBatchResult> {
  const enabledCodes = await listEnabledPlatformCodes();
  if (!enabledCodes.includes(input.platformCode)) return skippedBatchResult(input.routeId, input.orderNos);

  const connector = getConnector(input.platformCode);
  if (!connector?.shipBatch || !connector.fetchShipmentCandidates) return skippedBatchResult(input.routeId, input.orderNos);

  const routeDefinition = getAllPlatformDefinitions()
    .flatMap((definition) => definition.shipRoutes ?? [])
    .find((route) => route.id === input.routeId);
  if (!routeDefinition || !routeDefinition.automatable) return skippedBatchResult(input.routeId, input.orderNos);

  let packaging: ShipmentPackaging | null = null;
  if (routeDefinition.requiresPackaging) {
    packaging = shipmentPackagingFromEnvironment(MOMO_PACKAGING_ENV_PREFIX);
    if (!packaging) return skippedBatchResult(input.routeId, input.orderNos);
  }

  const { from, to } = resolveOrderDateRange(input.dateRange);
  const requestedOrderNos = new Set(input.orderNos);
  const candidates = (await connector.fetchShipmentCandidates({ from, to })).filter(
    (candidate) => candidate.routeId === input.routeId && requestedOrderNos.has(candidate.orderNo),
  );
  if (candidates.length === 0) return skippedBatchResult(input.routeId, input.orderNos);

  // 重查後不再匹配的訂單（平台端狀態已變動）不會進到 shipBatch，結果要顯式標成 SKIPPED，
  // 不能讓它們從回傳結果裡無聲消失。
  const matchedOrderNos = new Set(candidates.map((candidate) => candidate.orderNo));
  const missingOrderNos = input.orderNos.filter((orderNo) => !matchedOrderNos.has(orderNo));

  const [bindings, products] = await Promise.all([listProductBindings(), listProducts()]);

  try {
    const result = await connector.shipBatch({ routeId: input.routeId, candidates, packaging, bindings, products });
    if (missingOrderNos.length === 0) return result;
    return {
      ...result,
      results: [...result.results, ...missingOrderNos.map((orderNo) => ({ orderNo, state: "SKIPPED" as const }))],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      routeId: input.routeId,
      results: input.orderNos.map((orderNo) => ({ orderNo, state: "FAILED", message })),
      documents: [],
    };
  }
}

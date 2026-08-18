import type { PlatformCode } from "@/app/lib/platforms/types";
import type {
  ShipRouteId,
  ShipmentBlockReason,
  ShipmentCandidate,
  ShipmentDocument,
  ShipmentOrderState,
  ShipmentPackaging,
  ShipmentPlan,
  ShipmentPlanGroup,
  ShipmentStep,
  ShipmentWarning,
} from "@/app/types/shipment";
import type { Product } from "@/app/types/product";
import type { ProductBinding } from "@/app/types/product-binding";
import { groupBy } from "@/app/lib/platforms/mapper-utils";
import { bindingKey, indexBindings } from "./product-bindings";

/** 顯示單筆出貨結果時，避免平台未附錯誤訊息而留下空白原因。 */
export function shipmentResultMessage(state: ShipmentOrderState, message?: string): string {
  if (message) return message;
  return state === "FAILED" ? "平台未提供失敗原因" : "—";
}

/** 把陣列切成固定大小的批次；size 非正數時整批當成一批（不切）。 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) return items.length ? [[...items]] : [];
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

/** momo 出貨確認清單項目常見三種格式：純訂單編號、訂單編號加物流單號，或「訂單編號 : 錯誤訊息」。 */
function parseListEntry(entry: string): { orderNo: string; message?: string } {
  const trackingSeparatorIndex = entry.indexOf(" --- ");
  if (trackingSeparatorIndex !== -1) return { orderNo: entry.slice(0, trackingSeparatorIndex).trim() };

  const separatorIndex = entry.indexOf(":");
  if (separatorIndex === -1) return { orderNo: entry.trim() };
  const orderNo = entry.slice(0, separatorIndex).trim();
  const message = entry.slice(separatorIndex + 1).trim();
  return { orderNo, message: message || undefined };
}

interface MomoFinishResultLike {
  confirmOkList?: string[];
  confirmFailList?: string[];
  confirmRepeatList?: string[];
  undoList?: string[];
}

/**
 * 把 momo 出貨確認（unsendStoresFinish／unsendThirdFinish）的多份清單還原成逐筆狀態。
 *
 * confirmRepeatList（重複操作）視為成功——重試時本來就會撞到它，當成錯誤會讓使用者
 * 以為出貨失敗而重複處理，因此最後處理、優先權最高。
 * 完全沒出現在任何清單的訂單一律標為 FAILED：平台沒回報就是沒回報，
 * 猜成成功會讓漏出的訂單無聲消失。
 */
export function resolveMomoOrderStates(
  requested: readonly string[],
  infos: readonly MomoFinishResultLike[],
): Map<string, { state: ShipmentOrderState; message?: string }> {
  const states = new Map<string, { state: ShipmentOrderState; message?: string }>();

  const applyList = (lists: (string[] | undefined)[], state: ShipmentOrderState) => {
    for (const list of lists) {
      for (const entry of list ?? []) {
        const { orderNo, message } = parseListEntry(entry);
        if (!orderNo) continue;
        states.set(orderNo, { state, message });
      }
    }
  };

  applyList(infos.map((info) => info.undoList), "SKIPPED");
  applyList(infos.map((info) => info.confirmFailList), "FAILED");
  applyList(infos.map((info) => info.confirmOkList), "SUCCESS");
  applyList(infos.map((info) => info.confirmRepeatList), "ALREADY_DONE");

  for (const orderNo of requested) {
    if (!states.has(orderNo)) {
      states.set(orderNo, { state: "FAILED", message: "平台未回報此訂單結果，請至平台後台確認" });
    }
  }

  return states;
}

/** 讀 cvs_merge_limit（STORE）或 logistics_merge_limit（THIRD_PARTY）。 */
export function planComboBoxes(
  orders: readonly ShipmentCandidate[],
  route: "STORE" | "THIRD_PARTY",
  bindings: readonly ProductBinding[],
  products: readonly Product[],
): Map<string, string> {
  const boundIndex = indexBindings([...bindings]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const limitField = route === "STORE" ? "cvs_merge_limit" : "logistics_merge_limit";

  /** 這筆訂單裡，每個已綁定本地商品的數量（未綁定品項不設限，不列入）。 */
  const boundQtyByProductId = (order: ShipmentCandidate): Map<number, number> => {
    const qtyByProductId = new Map<number, number>();
    for (const item of order.items) {
      if (!item.goodsCode) continue;
      const binding = boundIndex.get(bindingKey(order.platformCode, item.goodsCode));
      if (!binding) continue;
      const product = productById.get(binding.product_id);
      if (!product) continue;
      qtyByProductId.set(product.id, (qtyByProductId.get(product.id) ?? 0) + item.qty);
    }
    return qtyByProductId;
  };

  // STORE 路徑物理上能併箱的前提是同門市同客；THIRD_PARTY 路徑只看同客。
  // 前面加固定前綴，避免門市／客戶欄位都缺值時 key 變成空字串——groupBy 會把空字串當成沒有 key 而整筆跳過。
  const destinationKey = (order: ShipmentCandidate) =>
    route === "STORE" ? `dest:${order.storeIdName ?? ""}::${order.custId ?? ""}` : `dest:${order.custId ?? ""}`;

  const byDestination = groupBy(orders, destinationKey);

  const result = new Map<string, string>();

  for (const destinationOrders of byDestination.values()) {
    const packable: ShipmentCandidate[] = [];

    for (const order of destinationOrders) {
      const qtyByProductId = boundQtyByProductId(order);
      // 只要有一個已綁定商品在此路徑的併單上限為 0，這筆訂單一律不併箱。
      const hasZeroLimitProduct = [...qtyByProductId.keys()].some((productId) => productById.get(productId)?.[limitField] === 0);
      if (hasZeroLimitProduct) result.set(order.orderNo, "00");
      else packable.push(order);
    }

    const sorted = [...packable].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let groupNo = 0;
    let currentBox: ShipmentCandidate[] = [];
    let currentQtyByProductId = new Map<number, number>();

    const closeBox = () => {
      if (currentBox.length === 0) return;
      // 規格書明寫併箱編號需兩筆以上訂單，單筆硬塞群組編號沒有意義。
      if (currentBox.length < 2) {
        for (const order of currentBox) result.set(order.orderNo, "00");
      } else {
        groupNo += 1;
        for (const order of currentBox) result.set(order.orderNo, String(groupNo));
      }
      currentBox = [];
      currentQtyByProductId = new Map();
    };

    for (const order of sorted) {
      const orderQtyByProductId = boundQtyByProductId(order);
      const wouldExceedLimit = [...orderQtyByProductId].some(([productId, qty]) => {
        const limit = productById.get(productId)?.[limitField] ?? Number.POSITIVE_INFINITY;
        return (currentQtyByProductId.get(productId) ?? 0) + qty > limit;
      });

      if (wouldExceedLimit && currentBox.length > 0) closeBox();

      currentBox.push(order);
      for (const [productId, qty] of orderQtyByProductId) {
        currentQtyByProductId.set(productId, (currentQtyByProductId.get(productId) ?? 0) + qty);
      }
    }
    closeBox();
  }

  return result;
}

/**
 * momo 第三方物流未出貨查詢以 `delyGb × delyTemp` 笛卡兒積打，同一筆訂單會重複出現在
 * 多個組合裡；出貨時重複送會踩到 `confirmRepeatList`，因此候選訂單要先去重。
 * 保留第一次出現的那筆。
 */
export function dedupeByOrderNo(candidates: readonly ShipmentCandidate[]): ShipmentCandidate[] {
  const seen = new Set<string>();
  const result: ShipmentCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.orderNo)) continue;
    seen.add(candidate.orderNo);
    result.push(candidate);
  }
  return result;
}

/**
 * 判斷平台回傳的列印內容是什麼格式——規格書沒說 `printLabel` 是什麼格式，
 * 這是必要的防禦，讓下載/預覽環節不會對著未知格式的字串盲目處理。
 */
export function classifyPrintPayload(value: string): ShipmentDocument["kind"] | null {
  if (/^https?:\/\//.test(value)) return "URL";
  if (/^JVBERi0/.test(value) || /^data:application\/pdf;base64,/.test(value)) return "PDF_BASE64";
  if (/^\s*</.test(value)) return "HTML";
  return null;
}

/** 預覽後重查候選訂單，回報平台端的異動（訂單被取消／新轉單）。以 ShipmentCandidate.id 比對。 */
export function diffCandidates(
  plannedIds: readonly string[],
  fresh: readonly ShipmentCandidate[],
): { added: string[]; removed: string[] } {
  const plannedIdSet = new Set(plannedIds);
  const freshIds = new Set(fresh.map((candidate) => candidate.id));
  return {
    added: fresh.filter((candidate) => !plannedIdSet.has(candidate.id)).map((candidate) => candidate.id),
    removed: plannedIds.filter((id) => !freshIds.has(id)),
  };
}

export interface ShipRouteMeta {
  label: string;
  steps: readonly ShipmentStep[];
  requiresPackaging: boolean;
}

export interface BuildShipmentPlanInput {
  candidates: readonly ShipmentCandidate[];
  /** 路徑的顯示中繼資料，通常來自 `PlatformDefinition.shipRoutes`。 */
  routes: ReadonlyMap<ShipRouteId, ShipRouteMeta>;
  /** 路徑目前可用的包材設定；不需要包材的路徑可留空。 */
  packagingByRoute: ReadonlyMap<ShipRouteId, ShipmentPackaging | null>;
  /** 供測試固定時間；預設為呼叫當下。 */
  now?: Date;
}

/** 依路徑分組候選訂單；同一路徑一次送往平台，包材未設定時整組標記 blocked。 */
export function buildShipmentPlan(input: BuildShipmentPlanInput): ShipmentPlan {
  const byRoute = new Map<ShipRouteId, ShipmentCandidate[]>();
  for (const candidate of input.candidates) {
    const bucket = byRoute.get(candidate.routeId);
    if (bucket) bucket.push(candidate);
    else byRoute.set(candidate.routeId, [candidate]);
  }

  const groups: ShipmentPlanGroup[] = [];
  const warnings: ShipmentWarning[] = [];
  let orderCount = 0;
  let automatableOrderCount = 0;

  for (const [routeId, orders] of byRoute) {
    const platformCode: PlatformCode = orders[0]!.platformCode;
    const meta = input.routes.get(routeId);
    const routeLabel = meta?.label ?? routeId;
    const requiresPackaging = meta?.requiresPackaging ?? false;
    const packaging = input.packagingByRoute.get(routeId) ?? null;
    const blocked: ShipmentBlockReason | null = requiresPackaging && !packaging ? "PACKAGING_NOT_CONFIGURED" : null;

    orderCount += orders.length;
    if (blocked) {
      warnings.push({ platformCode, routeId, scope: "ROUTE", message: `${routeLabel}：尚未設定包材，此路徑暫不會送出` });
    } else {
      automatableOrderCount += orders.length;
    }

    groups.push({
      platformCode,
      routeId,
      routeLabel,
      steps: meta?.steps ?? [],
      orders,
      batches: blocked ? [] : [{ orderNos: orders.map((order) => order.orderNo) }],
      packaging,
      blocked,
    });
  }

  return {
    groups,
    warnings,
    totals: { orderCount, automatableOrderCount },
    preparedAt: (input.now ?? new Date()).toISOString(),
  };
}

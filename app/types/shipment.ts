import type { PlatformCode } from "@/app/lib/platforms/types";
import type { OrderLineItem } from "./order";
import type { Product } from "./product";
import type { ProductBinding } from "./product-binding";

/**
 * 出貨路徑代碼，例如 `MOMO_MAIN:STORE`、`MO_STORE_PLUS:STORE:1`（7-11）。
 * 由 `ShipRouteDefinition.id` 定義，字面值集中在 definitions.ts。
 */
export type ShipRouteId = string;

/** 出貨流程的一個步驟，用於預覽畫面依序列出「將執行什麼」。 */
export interface ShipmentStep {
  id: string;
  label: string;
}

/**
 * 一筆可出貨的候選訂單。與訂單查詢頁的 `OrderItem` 分開維護：
 * `routeId` / `orderSeqs` / `custId` / `storeIdName` 對訂單查詢頁毫無意義，
 * 而且候選訂單送出前一定要重查（平台隨時可能轉單/取消），生命週期本來就不同。
 */
export interface ShipmentCandidate {
  /** `${platformCode}:${routeId}:${orderNo}` */
  id: string;
  platformCode: PlatformCode;
  routeId: ShipRouteId;
  orderNo: string;
  /** 店+ 以 (orderNo, orderSeq) 為出貨 key；momo 無此層，為空陣列。 */
  orderSeqs: string[];
  receiverName: string;
  createdAt: string;
  items: OrderLineItem[];
  totalQty: number;
  logistics: string;
  /** momo 個人識別碼（`custId`）。併箱分組鍵之一；店+ 無此欄位。 */
  custId?: string;
  /** momo 超取取貨門市（`storeIdName`）。併箱分組鍵之一，僅超取路徑有值。 */
  storeIdName?: string;
  /** momo 第三方物流商代碼（`third_delyGb`）。列印標籤時需依此分組，僅第三方物流路徑有值。 */
  thirdPartyDelyGb?: string;
  /**
   * 店+ 超商出貨確認用的 `delyGb`（倉到店／店到店 × 常溫／冷凍）。
   * `OrderQuery` 沒有可靠欄位判斷倉到店／店到店方向，目前一律假設倉到店
   * （見 shipping-implementation-plan.md 未知數清單），僅超取路徑有值。
   */
  storeDelyGb?: string;
}

/**
 * 廠商配送（momo）與宅配（店+）不納入 `shipRoutes`，因此不需要
 * `MANUAL_INPUT_REQUIRED` / `ROUTE_NOT_SUPPORTED`：目前唯一會擋下自動化路徑的
 * 情境是 momo 包材未設定。
 */
export type ShipmentBlockReason = "PACKAGING_NOT_CONFIGURED";

/** 出貨用的包材設定（momo 專用；平台語彙轉換放在 connector）。 */
export interface ShipmentPackaging {
  shipPack: string;
  packType: string;
  packUnit: string;
}

/** 同一路徑一次送往平台的訂單編號。 */
export interface ShipmentPlanBatch {
  orderNos: string[];
}

/** 預覽畫面的一組：同平台、同出貨路徑的候選訂單。 */
export interface ShipmentPlanGroup {
  platformCode: PlatformCode;
  routeId: ShipRouteId;
  routeLabel: string;
  /** 預覽畫面照這份資料列出「將執行什麼」。 */
  steps: readonly ShipmentStep[];
  orders: ShipmentCandidate[];
  batches: ShipmentPlanBatch[];
  packaging: ShipmentPackaging | null;
  blocked: ShipmentBlockReason | null;
}

export interface ShipmentWarning {
  platformCode: PlatformCode;
  routeId: ShipRouteId;
  /** ROUTE：單一路徑的問題（如包材未設定）。PLATFORM：整個平台候選訂單查詢失敗，與特定路徑無關。 */
  scope: "ROUTE" | "PLATFORM";
  message: string;
}

export interface ShipmentPlanTotals {
  orderCount: number;
  /** blocked 為 null 的路徑底下的訂單數；預覽對話框「共 N 筆將送出」用這個。 */
  automatableOrderCount: number;
}

export interface ShipmentPlan {
  groups: ShipmentPlanGroup[];
  warnings: ShipmentWarning[];
  totals: ShipmentPlanTotals;
  preparedAt: string;
}

export type ShipmentOrderState = "SUCCESS" | "ALREADY_DONE" | "FAILED" | "SKIPPED";

export interface ShipmentOrderResult {
  orderNo: string;
  state: ShipmentOrderState;
  message?: string;
  trackingNo?: string;
}

/** 出貨產生的可列印文件。Workers 沒有檔案系統，PDF 以 base64 傳到瀏覽器再組回 Blob。 */
export interface ShipmentDocument {
  platformCode: PlatformCode;
  routeId: ShipRouteId;
  name: string;
  kind: "PDF_BASE64" | "HTML" | "URL";
  content: string;
  orderNos: string[];
}

export interface ShipmentBatchResult {
  routeId: ShipRouteId;
  results: ShipmentOrderResult[];
  documents: ShipmentDocument[];
}

export interface ShipmentQuery {
  from: Date;
  to: Date;
}

/**
 * 對「一批同路徑訂單」執行出貨的請求。`bindings` / `products` 只有 momo 的
 * `planComboBoxes`（依商品併單上限分組）會用到，店+ 不併箱因此忽略。
 */
export interface ShipmentRequest {
  routeId: ShipRouteId;
  candidates: ShipmentCandidate[];
  packaging: ShipmentPackaging | null;
  bindings: ProductBinding[];
  products: Product[];
}

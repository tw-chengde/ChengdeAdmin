import type { OrderItem } from "@/app/types/order";
import type {
  ShipmentBatchResult,
  ShipmentCandidate,
  ShipmentQuery,
  ShipmentRequest,
} from "@/app/types/shipment";
import type { PlatformProduct, PlatformProductQuery } from "./product";
import type { PlatformSalesQuery, PlatformSalesStatistics } from "./sales";
import type { PlatformDefinition } from "./types";

export interface PlatformOrderQuery {
  from: Date;
  to: Date;
  /** 平台原生的訂單狀態值；未指定時由各平台查詢全部可用狀態。 */
  status?: string;
  /** 配送類型（例如 Mo 店+ 的 Home / Store）。 */
  deliveryType?: string;
  /** 超取分類（例如 Mo 店+ 的 1 / 2、momo 的 21 / 27）。 */
  storeDeliveryType?: string;
  /** 出貨中訂單的細狀態（例如 momo 超商取貨的 1~5）；"All" 或未指定時查詢全部細狀態。 */
  shippingStatus?: string;
}

/** 單一電商平台的訂單擷取邏輯（Strategy）。新增平台時實作一個新的 connector 並註冊進 registry.ts。 */
export interface PlatformConnector {
  definition: PlatformDefinition;
  /** 取得該平台的訂單。目前回傳 mock 資料篩選結果；之後串接真實 API 時只需改動這裡的實作。 */
  fetchOrders(query: PlatformOrderQuery): Promise<OrderItem[]>;
  /** Loads the platform's unprocessed, shippable orders for the cross-platform picking sheet. */
  fetchPickingSheetOrders(query: PlatformOrderQuery): Promise<OrderItem[]>;
  /** 依查詢條件取得該平台的商品（goodsCode 層級），供併單管理頁綁定本地商品。 */
  fetchProducts(query: PlatformProductQuery): Promise<PlatformProduct[]>;
  /**
   * 取得查詢區間的銷售統計，供營運總覽彙總。
   *
   * 與 `fetchOrders` 分開是因為兩者要的東西不同：總覽要的是加總數字，
   * 而有些平台（momo SCM）另有專門的統計 API，回的根本不是訂單。
   */
  fetchSalesStatistics(query: PlatformSalesQuery): Promise<PlatformSalesStatistics>;
  /**
   * 取得查詢區間內尚未出貨的訂單數。
   *
   * 「未出貨」在各平台是不同的原生狀態值（momo 是 UNSHIPPED，mo店+ 是
   * NotShipped／Printed），呼叫端無法用一個共通的 `status` 表達，因此獨立成一個方法。
   * 與銷售統計分開則是因為總覽只需要當月的待出貨數，歷史區間不必為此多打 API。
   */
  fetchPendingShipmentCount(query: PlatformSalesQuery): Promise<number>;
  /**
   * 取得可一鍵出貨的候選訂單，依 `definition.shipRoutes` 分路徑。
   *
   * 與 `fetchOrders` 分開是因為候選訂單多出 `routeId` / `orderSeqs` / `custId` 等
   * 出貨專用欄位，塞進 `OrderItem` 只會讓訂單查詢頁的消費端多處理用不到的欄位。
   * 未實作的平台視為「尚不支援一鍵出貨」。
   */
  fetchShipmentCandidates?(query: ShipmentQuery): Promise<ShipmentCandidate[]>;
  /**
   * 對「一批同路徑訂單」執行完整出貨流程。逐筆回報結果，只有整批被平台拒絕才 throw。
   * 未實作的平台視為「尚不支援一鍵出貨」。
   */
  shipBatch?(request: ShipmentRequest): Promise<ShipmentBatchResult>;
}

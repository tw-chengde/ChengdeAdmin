import type { ShipRouteId, ShipmentBlockReason, ShipmentStep } from "@/app/types/shipment";

export type PlatformCode = "MOMO_MAIN" | "MO_STORE_PLUS";

/**
 * 一條可一鍵出貨的路徑（例如「momo 超商取貨」「店+ 7-11」）。
 *
 * 廠商配送（momo）與宅配（店+）不納入——這兩者完全不在 `shipRoutes` 裡出現，
 * 而不是以 `automatable: false` 佔位；未納入的通路在畫面上一律不渲染。
 */
export interface ShipRouteDefinition {
  id: ShipRouteId;
  label: string;
  /** 平台原生的配送類型值（例如 momo 的 Store／ThirdParty）。 */
  deliveryType: string;
  /** 平台原生的超取分類值；非超取路徑為 null。 */
  storeDeliveryType: string | null;
  /** false 時預覽只列出、不送出。目前全數路徑皆為 true。 */
  automatable: boolean;
  /** automatable=false 時直接顯示給使用者；目前沒有路徑用到。 */
  manualReason?: string;
  blockReason?: ShipmentBlockReason;
  steps: readonly ShipmentStep[];
  requiresPackaging: boolean;
  producesDocument: boolean;
}

/** 訂單查詢頁下拉選單的選項結構（狀態、配送類型、超取分類等）。 */
export interface OrderStatusOption {
  /** 送進 connector 的狀態值，各平台自行解讀（多半直接轉給平台 API）。 */
  value: string;
  label: string;
}

export type DeliveryTypeOption = OrderStatusOption;
export type StoreDeliveryTypeOption = OrderStatusOption;
export type ShippingStatusOption = OrderStatusOption;

export interface PlatformDefinition {
  code: PlatformCode;
  name: string;
  /**
   * 該平台支援的訂單狀態查詢選項，第一個為預設值。
   *
   * 放在定義而非 connector，是因為訂單頁（client component）要直接渲染它；
   * connector 那側會拉進平台 API client，不能進 client bundle。
   */
  orderStatusOptions: readonly OrderStatusOption[];
  /** 可選：該平台支援的配送類型選項（例如 Mo 店+ 的 宅配 / 店配）。 */
  deliveryTypeOptions?: readonly DeliveryTypeOption[];
  /** 可選：該平台支援的超取分類選項（例如 Mo 店+ 的 7-ELEVEN / 全家）。 */
  storeDeliveryTypeOptions?: readonly StoreDeliveryTypeOption[];
  /** 可選：會顯示超取分類的配送類型值。 */
  storeDeliveryTypeForDeliveryTypes?: readonly string[];
  /**
   * 可選：出貨中細狀態選項，key 為配送類型值。
   *
   * 之所以依配送類型分組，是因為各配送方式的細狀態代碼並不共用
   * （momo 超商取貨有五種、第三方物流只有兩種），沒有共同選項可用，
   * 因此未選定單一配送類型時就不顯示這個欄位。
   */
  shippingStatusOptionsByDeliveryType?: Readonly<Record<string, readonly ShippingStatusOption[]>>;
  /** 可選：會顯示出貨中細狀態的訂單狀態值。 */
  shippingStatusForOrderStatuses?: readonly string[];
  /** 可選：該平台支援一鍵出貨的路徑。未定義或空陣列＝尚不支援一鍵出貨。 */
  shipRoutes?: readonly ShipRouteDefinition[];
  logo: string;
  logoObjectFit: "contain" | "cover";
  color: string;
  bgcolor: string;
  borderColor: string;
  gradient: string;
}

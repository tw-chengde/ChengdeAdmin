export type PlatformCode = "MOMO_MAIN" | "MO_STORE_PLUS";

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
  logo: string;
  logoObjectFit: "contain" | "cover";
  color: string;
  bgcolor: string;
  borderColor: string;
  gradient: string;
}

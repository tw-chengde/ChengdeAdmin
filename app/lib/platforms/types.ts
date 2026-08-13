export type PlatformCode = "MOMO_MAIN" | "MO_STORE_PLUS";

/** 訂單管理頁「訂單狀態」下拉選單的一個選項。 */
export interface OrderStatusOption {
  /** 送進 connector 的狀態值，各平台自行解讀（多半直接轉給平台 API）。 */
  value: string;
  label: string;
}

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
  logo: string;
  logoObjectFit: "contain" | "cover";
  color: string;
  bgcolor: string;
  borderColor: string;
  gradient: string;
}

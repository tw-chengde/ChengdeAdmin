import type {
  OrderStatusOption,
  PlatformDefinition,
  ShipRouteDefinition,
  ShippingStatusOption,
  StoreDeliveryTypeOption,
} from "./types";
import type { ShipmentStep } from "@/app/types/shipment";

/** momo 的超商取貨／第三方物流出貨流程：併箱 → 出貨確認 → 列印標籤。 */
const MOMO_SHIP_STEPS: readonly ShipmentStep[] = [
  { id: "combine", label: "併箱" },
  { id: "confirm", label: "出貨確認" },
  { id: "print", label: "列印標籤" },
];

/** 店+ 出貨確認 API 一次回傳物流單號與標籤，沒有獨立的併箱／列印步驟。 */
const MO_STORE_PLUS_SHIP_STEPS: readonly ShipmentStep[] = [{ id: "confirm", label: "出貨確認" }];

/** 各平台共通的「全部狀態」選項；也是「全部電商通路」分頁唯一的選項。 */
export const ALL_ORDER_STATUS_OPTION: OrderStatusOption = { value: "ALL", label: "全部狀態" };

const ALL_SHIPPING_STATUS_OPTION: ShippingStatusOption = { value: "All", label: "全部出貨中狀態" };

/**
 * momo SCM「出貨中訂單」的細狀態代碼，依配送類型分組
 *（sendingStoresQuery／sendingThirdQuery 的 sendInfo.status）。
 *
 * 只用於組查詢條件與下拉選單；訂單列表顯示的細狀態文字讀回應的 code_name，
 * 不從這裡的 label 回推——同一筆訂單的狀態可能在兩次查詢之間變動。
 */
export const MOMO_SHIPPING_STATUS_OPTIONS = {
  Store: [
    { value: "1", label: "已印單待驗收" },
    { value: "2", label: "已印單未到貨" },
    { value: "3", label: "商品驗退需重新出貨" },
    { value: "4", label: "待客戶取件" },
    { value: "5", label: "進驗尚未配達門市" },
  ],
  ThirdParty: [
    { value: "1", label: "已印單" },
    { value: "2", label: "配送中" },
  ],
} as const satisfies Record<string, readonly ShippingStatusOption[]>;

/**
 * momo SCM 超商取貨的 dely_gb 代碼。
 *
 * label 同時是訂單列表上顯示的超商品牌名稱，因此 momo-order-mapper 也讀這份定義，
 * 避免下拉選單與訂單資料出現兩套超商名稱。
 */
export const MOMO_STORE_DELIVERY_TYPE_OPTIONS = [
  { value: "21", label: "7-11" },
  { value: "27", label: "全家" },
  { value: "28", label: "7-11 店到店" },
  { value: "29", label: "全家 店到店" },
  { value: "2A", label: "OK mart" },
  { value: "2B", label: "萊爾富" },
] as const satisfies readonly StoreDeliveryTypeOption[];

/**
 * 各平台的顯示定義（純資料）。
 *
 * 這個模組刻意不 import 任何 connector、client 或讀取 process.env，
 * 因此可以安全地被 client component 匯入。connector 那一側（registry.ts）
 * 會拉進平台 API client 與憑證讀取，只能在伺服器端使用。
 *
 * 新增平台時在這裡加入定義，並在 registry.ts 註冊對應的 connector。
 */
export const momoDefinition: PlatformDefinition = {
  code: "MOMO_MAIN",
  name: "MOMO 購物網",
  logo: "/images/momo.png",
  logoObjectFit: "contain",
  color: "#ec008c",
  bgcolor: "rgba(236, 0, 140, 0.08)",
  borderColor: "rgba(236, 0, 140, 0.25)",
  gradient: "linear-gradient(135deg, #ec008c, #d80073)",
  // momo SCM 將不同訂單狀態拆成不同查詢 API；目前已串接未出貨及出貨中訂單。
  orderStatusOptions: [
    ALL_ORDER_STATUS_OPTION,
    { value: "UNSHIPPED", label: "未出貨" },
    { value: "SHIPPING", label: "出貨中" },
  ],
  // momo SCM 的廠商配送（unsendCompanyQuery）尚未串接，故只列出已支援的兩種配送方式。
  deliveryTypeOptions: [
    { value: "All", label: "全部配送方式" },
    { value: "Store", label: "超商取貨" },
    { value: "ThirdParty", label: "第三方物流" },
  ],
  storeDeliveryTypeOptions: [{ value: "All", label: "全部超商" }, ...MOMO_STORE_DELIVERY_TYPE_OPTIONS],
  storeDeliveryTypeForDeliveryTypes: ["Store"],
  // 送出時對應 sendingStoresQuery／sendingThirdQuery 的 sendInfo.status。
  shippingStatusOptionsByDeliveryType: {
    Store: [ALL_SHIPPING_STATUS_OPTION, ...MOMO_SHIPPING_STATUS_OPTIONS.Store],
    ThirdParty: [ALL_SHIPPING_STATUS_OPTION, ...MOMO_SHIPPING_STATUS_OPTIONS.ThirdParty],
  },
  shippingStatusForOrderStatuses: ["SHIPPING"],
  // 廠商配送（unsendCompanyConfirm）不納入：目前沒有走廠商配送出貨的品項，
  // 且平台不產生物流商／單號，無法自動化。
  shipRoutes: [
    {
      id: "MOMO_MAIN:STORE",
      label: "超商取貨",
      deliveryType: "Store",
      storeDeliveryType: null,
      automatable: true,
      steps: MOMO_SHIP_STEPS,
      requiresPackaging: true,
      producesDocument: true,
    },
    {
      id: "MOMO_MAIN:THIRD_PARTY",
      label: "第三方物流",
      deliveryType: "ThirdParty",
      storeDeliveryType: null,
      automatable: true,
      steps: MOMO_SHIP_STEPS,
      requiresPackaging: true,
      producesDocument: true,
    },
  ] satisfies readonly ShipRouteDefinition[],
};

export const moStorePlusDefinition: PlatformDefinition = {
  code: "MO_STORE_PLUS",
  name: "Mo 店+",
  logo: "/images/mo-store.jpg",
  logoObjectFit: "cover",
  color: "#2b4885",
  bgcolor: "rgba(43, 72, 133, 0.08)",
  borderColor: "rgba(43, 72, 133, 0.25)",
  gradient: "linear-gradient(135deg, #2b4885, #1e3a8a)",
  // 依 Mo 店+ OrderQuery 的 orderStatus 定義；value 直接傳給平台 API。
  orderStatusOptions: [
    { value: "All", label: "全部狀態" },
    { value: "Unpaid", label: "未付款" },
    { value: "NotShipped", label: "未出貨（未印單）" },
    { value: "NotRecycled", label: "未回收" },
    { value: "Printed", label: "已印單" },
    { value: "Shipping", label: "配送中" },
    { value: "DoneDelivery", label: "配送結束" },
    { value: "AbnormalDelivery", label: "配送異常" },
    { value: "OrderCancelled", label: "取消訂單" },
    { value: "ReturnCancelled", label: "取消退貨" },
    { value: "RecycleConfirmed", label: "回收確認" },
  ],
  deliveryTypeOptions: [
    { value: "All", label: "全部配送方式" },
    { value: "Home", label: "宅配" },
    { value: "Store", label: "超取" },
    { value: "ThirdParty", label: "第三方物流" },
  ],
  /**
   * 依 OrderQuery 的 storeDeliveryType 定義。這裡是「取件流向」而不是超商品牌——
   * mo店+ 沒有依 7-ELEVEN／全家等品牌篩選的能力，那是 momo SCM 的 dely_gb 才有的。
   */
  storeDeliveryTypeOptions: [
    { value: "All", label: "全部超取分類" },
    { value: "StoreToStoreShip", label: "店到店配送" },
    { value: "StoreToStoreReturn", label: "店到店退貨" },
    { value: "WarehouseToStoreShip", label: "倉到店配送" },
    { value: "StoreToWarehouseReturn", label: "店到倉退貨" },
  ],
  storeDeliveryTypeForDeliveryTypes: ["Store"],
  // 宅配（OrderShippingStatusConfirmHomeDelivery）不納入：宅配出貨不在本專案範圍內。
  // 萊爾富／OK 不納入：規格書只提供 7-11／全家的出貨確認端點。
  shipRoutes: [
    {
      id: "MO_STORE_PLUS:STORE:1",
      label: "7-11 超商",
      deliveryType: "Store",
      // OrderQuery 沒有專門的超商品牌欄位，改用 listItem[].deliveryCompany 分辨
      // （目前只會出現「7-11店到店」／「全家店到店」兩種字面值）。
      storeDeliveryType: "7-11店到店",
      automatable: true,
      steps: MO_STORE_PLUS_SHIP_STEPS,
      requiresPackaging: false,
      producesDocument: true,
    },
    {
      id: "MO_STORE_PLUS:STORE:2",
      label: "全家超商",
      deliveryType: "Store",
      storeDeliveryType: "全家店到店",
      automatable: true,
      steps: MO_STORE_PLUS_SHIP_STEPS,
      requiresPackaging: false,
      producesDocument: true,
    },
    {
      id: "MO_STORE_PLUS:THIRD_PARTY",
      label: "第三方物流",
      deliveryType: "ThirdParty",
      storeDeliveryType: null,
      automatable: true,
      steps: MO_STORE_PLUS_SHIP_STEPS,
      requiresPackaging: false,
      producesDocument: true,
    },
  ] satisfies readonly ShipRouteDefinition[],
};

/** 所有已知平台的定義。順序即畫面上分頁預設的排列順序。 */
const definitions: readonly PlatformDefinition[] = [momoDefinition, moStorePlusDefinition];

/** 回傳所有平台的顯示中繼資料，不受啟用狀態影響（設定頁需要列出全部平台）。 */
export function getAllPlatformDefinitions(): PlatformDefinition[] {
  return [...definitions];
}

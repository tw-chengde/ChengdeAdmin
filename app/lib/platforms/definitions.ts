import type { OrderStatusOption, PlatformDefinition } from "./types";

/** 各平台共通的「全部狀態」選項；也是「全部電商通路」分頁唯一的選項。 */
export const ALL_ORDER_STATUS_OPTION: OrderStatusOption = { value: "ALL", label: "全部狀態" };

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
  storeDeliveryTypeOptions: [
    { value: "All", label: "全部超商" },
    { value: "1", label: "7-ELEVEN" },
    { value: "2", label: "全家便利商店" },
    { value: "3", label: "萊爾富" },
    { value: "4", label: "OK超商" },
  ],
  storeDeliveryTypeForDeliveryTypes: ["Store"],
};

/** 所有已知平台的定義。順序即畫面上分頁預設的排列順序。 */
const definitions: readonly PlatformDefinition[] = [momoDefinition, moStorePlusDefinition];

/** 回傳所有平台的顯示中繼資料，不受啟用狀態影響（設定頁需要列出全部平台）。 */
export function getAllPlatformDefinitions(): PlatformDefinition[] {
  return [...definitions];
}

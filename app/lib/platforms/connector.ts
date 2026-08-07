import type { OrderItem } from "@/app/types/order";
import type { PlatformDefinition } from "./types";

/** 單一電商平台的訂單擷取邏輯（Strategy）。新增平台時實作一個新的 connector 並註冊進 registry.ts。 */
export interface PlatformConnector {
  definition: PlatformDefinition;
  /** 取得該平台的訂單。目前回傳 mock 資料篩選結果；之後串接真實 API 時只需改動這裡的實作。 */
  fetchOrders(): Promise<OrderItem[]>;
}

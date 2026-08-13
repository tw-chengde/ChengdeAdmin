import type { OrderItem } from "@/app/types/order";
import type { PlatformProduct, PlatformProductQuery } from "./product";
import type { PlatformDefinition } from "./types";

export interface PlatformOrderQuery {
  from: Date;
  to: Date;
  /** 平台原生的訂單狀態值；未指定時由各平台查詢全部可用狀態。 */
  status?: string;
}

/** 單一電商平台的訂單擷取邏輯（Strategy）。新增平台時實作一個新的 connector 並註冊進 registry.ts。 */
export interface PlatformConnector {
  definition: PlatformDefinition;
  /** 取得該平台的訂單。目前回傳 mock 資料篩選結果；之後串接真實 API 時只需改動這裡的實作。 */
  fetchOrders(query: PlatformOrderQuery): Promise<OrderItem[]>;
  /** 依查詢條件取得該平台的商品（goodsCode 層級），供併單管理頁綁定本地商品。 */
  fetchProducts(query: PlatformProductQuery): Promise<PlatformProduct[]>;
}

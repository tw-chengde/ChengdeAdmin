import type { PlatformConnector } from "./connector";
import { moStorePlusDefinition } from "./definitions";
import { MoStorePlusClient } from "./mo-store-plus-client";
import { mapMoStorePlusOrders } from "./mo-store-plus-order-mapper";
import { mapMoStorePlusGoods } from "./mo-store-plus-product-mapper";
import type { ListingStatusFilter } from "./product";

/** 商品狀態查詢條件對應 mo店+ 的 saleStatus。 */
const saleStatusByListingStatus: Record<ListingStatusFilter, string> = {
  ALL: "All",
  LISTED: "StartSelling",
  DELISTED: "StopSelling",
};

export interface MoStorePlusConnectorOptions {
  /**
   * 建立 mo店+ client。預設在每次查詢時才從環境變數建立，
   * 維持「設定錯誤在查詢時才報，而非模組載入時」的行為。
   */
  createClient?: () => MoStorePlusClient;
}

/**
 * Mo 店+ 直營賣場。
 *
 * 以工廠而非直接匯出物件的形式提供，測試才能注入假的 client，
 * 不必動 process.env 或覆寫 globalThis.fetch。
 */
export function createMoStorePlusConnector(options: MoStorePlusConnectorOptions = {}): PlatformConnector {
  const createClient = options.createClient ?? (() => MoStorePlusClient.fromEnvironment());

  return {
    definition: moStorePlusDefinition,
    async fetchOrders(query) {
      return mapMoStorePlusOrders(
        await createClient().fetchOrders({
          ...query,
          orderStatus: query.status === "ALL" ? "All" : query.status,
          deliveryType: query.deliveryType ?? "All",
          storeDeliveryType: query.storeDeliveryType ?? "All",
        }),
      );
    },
    async fetchProducts(query) {
      const saleStatus = saleStatusByListingStatus[query.listingStatus];
      return mapMoStorePlusGoods(await createClient().fetchGoods({ saleStatus }));
    },
  };
}

export const moStorePlusConnector = createMoStorePlusConnector();

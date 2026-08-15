import type { PlatformConnector } from "./connector";
import { moStorePlusDefinition } from "./definitions";
import { MoStorePlusClient } from "./mo-store-plus-client";
import { mapMoStorePlusOrders } from "./mo-store-plus-order-mapper";
import { mapMoStorePlusGoods } from "./mo-store-plus-product-mapper";
import type { ListingStatusFilter } from "./product";
import { summarizeOrders, type PlatformSalesQuery } from "./sales";

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

  /** 區間內全部狀態的訂單；銷售統計與待出貨數都是從這一份推導出來的。 */
  const fetchAllOrders = async (query: PlatformSalesQuery) =>
    mapMoStorePlusOrders(
      await createClient().fetchOrders({
        ...query,
        orderStatus: "All",
        deliveryType: "All",
        storeDeliveryType: "All",
      }),
    );

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
    async fetchSalesStatistics(query) {
      return summarizeOrders(await fetchAllOrders(query));
    },
    async fetchPendingShipmentCount(query) {
      // 平台的 NotShipped／Printed 都對應到統一狀態的「待發貨」，
      // 用正規化後的狀態來數，才不會漏掉其中一種。
      return (await fetchAllOrders(query)).filter((order) => order.status === "待發貨").length;
    },
  };
}

export const moStorePlusConnector = createMoStorePlusConnector();

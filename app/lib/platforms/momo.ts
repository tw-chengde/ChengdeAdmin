import { allowedValuesFromEnvironment } from "./config";
import type { PlatformConnector, PlatformOrderQuery } from "./connector";
import { momoDefinition } from "./definitions";
import { mapMomoShippingOrders, mapMomoUnshippedOrders } from "./momo-order-mapper";
import { mapMomoGoodsBasicData } from "./momo-product-mapper";
import { MomoScmClient } from "./momo-scm-client";
import type { ListingStatusFilter } from "./product";

/** 商品狀態查詢條件對應 momo 的 saleGb：留空＝全部、00＝進行、11＝暫時中斷。 */
const saleGbByListingStatus: Record<ListingStatusFilter, string> = {
  ALL: "",
  LISTED: "00",
  DELISTED: "11",
};

const storeDeliveryTypes = ["21", "27", "28", "29", "2A", "2B"] as const;
const shippingStoreStatuses = ["1", "2", "3", "4", "5"] as const;
const shippingThirdPartyStatuses = ["1", "2"] as const;
const supportedThirdPartyDeliveryTypes = ["61", "62", "63", "65"] as const;
const supportedThirdPartyTemperatureTypes = ["01", "02", "03"] as const;

type ThirdPartyDeliveryType = (typeof supportedThirdPartyDeliveryTypes)[number];
type ThirdPartyTemperatureType = (typeof supportedThirdPartyTemperatureTypes)[number];

export interface MomoConnectorOptions {
  /**
   * 建立 SCM client。預設在每次查詢時才從環境變數建立，
   * 維持「憑證設定錯誤在查詢時才報，而非模組載入時」的行為。
   */
  createClient?: () => MomoScmClient;
  /** 第三方物流的物流商別；預設讀環境變數，未設定則查全部支援的物流商。 */
  thirdPartyDeliveryTypes?: readonly ThirdPartyDeliveryType[];
  /** 第三方物流的溫層別；預設讀環境變數，未設定則查全部支援的溫層。 */
  thirdPartyTemperatureTypes?: readonly ThirdPartyTemperatureType[];
}

/**
 * MOMO 購物網。已串接 SCM 的未出貨與出貨中（超商取貨、第三方物流）訂單查詢。
 *
 * 以工廠而非直接匯出物件的形式提供，測試才能注入假的 client 與查詢範圍，
 * 不必動 process.env 或覆寫 globalThis.fetch。
 */
export function createMomoConnector(options: MomoConnectorOptions = {}): PlatformConnector {
  const createClient = options.createClient ?? (() => MomoScmClient.fromEnvironment());

  // 依這個 momo 帳號實際支援的物流商／溫層縮小查詢範圍；未設定時維持規格書上的完整範圍。
  const thirdPartyScope = () => ({
    deliveryTypes:
      options.thirdPartyDeliveryTypes ??
      allowedValuesFromEnvironment("MOMO_SCM_THIRD_PARTY_DELIVERY_TYPES", supportedThirdPartyDeliveryTypes),
    temperatureTypes:
      options.thirdPartyTemperatureTypes ??
      allowedValuesFromEnvironment("MOMO_SCM_THIRD_PARTY_TEMPERATURE_TYPES", supportedThirdPartyTemperatureTypes),
  });

  const fetchUnshipped = async (client: MomoScmClient, query: PlatformOrderQuery) => {
    const { deliveryTypes, temperatureTypes } = thirdPartyScope();
    const [storeOrders, thirdPartyOrders] = await Promise.all([
      Promise.all(storeDeliveryTypes.map((delyGb) => client.queryUnshippedStoreOrders({ ...query, delyGb }))),
      Promise.all(
        deliveryTypes.flatMap((delyGb) =>
          temperatureTypes.map((delyTemp) => client.queryUnshippedThirdPartyOrders({ ...query, delyGb, delyTemp })),
        ),
      ),
    ]);
    return mapMomoUnshippedOrders([...storeOrders.flat(), ...thirdPartyOrders.flat()]);
  };

  const fetchShipping = async (client: MomoScmClient, query: PlatformOrderQuery) => {
    const { deliveryTypes } = thirdPartyScope();
    const [storeOrders, thirdPartyOrders] = await Promise.all([
      Promise.all(
        storeDeliveryTypes.flatMap((delyGb) =>
          shippingStoreStatuses.map((status) => client.queryShippingStoreOrders({ ...query, delyGb, status })),
        ),
      ),
      Promise.all(
        deliveryTypes.flatMap((logistics) =>
          shippingThirdPartyStatuses.map((status) => client.queryShippingThirdPartyOrders({ ...query, logistics, status })),
        ),
      ),
    ]);
    return mapMomoShippingOrders([...storeOrders.flat(), ...thirdPartyOrders.flat()]);
  };

  return {
    definition: momoDefinition,
    async fetchOrders(query) {
      const client = createClient();
      if (query.status === "UNSHIPPED") return fetchUnshipped(client, query);
      if (query.status === "SHIPPING") return fetchShipping(client, query);
      const [unshippedOrders, shippingOrders] = await Promise.all([
        fetchUnshipped(client, query),
        fetchShipping(client, query),
      ]);
      return [...unshippedOrders, ...shippingOrders];
    },
    async fetchProducts(query) {
      const saleGb = saleGbByListingStatus[query.listingStatus];
      return mapMomoGoodsBasicData(await createClient().queryGoodsBasicData({ saleGb }));
    },
  };
}

export const momoConnector = createMomoConnector();

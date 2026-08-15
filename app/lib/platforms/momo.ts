import { allowedValuesFromEnvironment } from "./config";
import type { PlatformConnector, PlatformOrderQuery } from "./connector";
import { MOMO_SHIPPING_STATUS_OPTIONS, MOMO_STORE_DELIVERY_TYPE_OPTIONS, momoDefinition } from "./definitions";
import { mapMomoSalesStatistics, mapMomoShippingOrders, mapMomoUnshippedOrders } from "./momo-order-mapper";
import { mapMomoGoodsBasicData } from "./momo-product-mapper";
import { MomoScmClient } from "./momo-scm-client";
import type { ListingStatusFilter } from "./product";

/** 商品狀態查詢條件對應 momo 的 saleGb：留空＝全部、00＝進行、11＝暫時中斷。 */
const saleGbByListingStatus: Record<ListingStatusFilter, string> = {
  ALL: "",
  LISTED: "00",
  DELISTED: "11",
};

const storeDeliveryTypes = MOMO_STORE_DELIVERY_TYPE_OPTIONS.map((option) => option.value);
// 細狀態代碼與下拉選單共用同一份定義，避免兩邊漏改而查到／標示成錯誤的狀態。
const shippingStoreStatuses = MOMO_SHIPPING_STATUS_OPTIONS.Store.map((option) => option.value);
const shippingThirdPartyStatuses = MOMO_SHIPPING_STATUS_OPTIONS.ThirdParty.map((option) => option.value);
const supportedThirdPartyDeliveryTypes = ["61", "62", "63", "65"] as const;
const supportedThirdPartyTemperatureTypes = ["01", "02", "03"] as const;

type ThirdPartyDeliveryType = (typeof supportedThirdPartyDeliveryTypes)[number];
type ThirdPartyTemperatureType = (typeof supportedThirdPartyTemperatureTypes)[number];

/**
 * 訂單頁的下拉選單以 "All" 表示不限縮；SCM 沒有對應的「全部」查詢值，
 * 只能改用逐一查詢再合併的方式，因此這裡把選取值轉成要送出的查詢值清單。
 */
function selectedOrAll<T extends string>(supported: readonly T[], selected: string | undefined): readonly T[] {
  return supported.includes(selected as T) ? [selected as T] : supported;
}

/** 未選定配送類型（"All"）時，兩種已串接的配送方式都要查。 */
const includesStoreDelivery = (query: PlatformOrderQuery) => query.deliveryType !== "ThirdParty";
const includesThirdPartyDelivery = (query: PlatformOrderQuery) => query.deliveryType !== "Store";

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

  /** 依「配送類型」與「超取分類」決定要查哪幾個超商代碼；未選超商取貨時完全不查。 */
  const queriedStoreDeliveryTypes = (query: PlatformOrderQuery) =>
    includesStoreDelivery(query) ? selectedOrAll(storeDeliveryTypes, query.storeDeliveryType) : [];

  const queriedThirdPartyDeliveryTypes = (query: PlatformOrderQuery) =>
    includesThirdPartyDelivery(query) ? thirdPartyScope().deliveryTypes : [];

  const fetchUnshipped = async (client: MomoScmClient, query: PlatformOrderQuery) => {
    const { temperatureTypes } = thirdPartyScope();
    const [storeOrders, thirdPartyOrders] = await Promise.all([
      Promise.all(queriedStoreDeliveryTypes(query).map((delyGb) => client.queryUnshippedStoreOrders({ ...query, delyGb }))),
      Promise.all(
        queriedThirdPartyDeliveryTypes(query).flatMap((delyGb) =>
          temperatureTypes.map((delyTemp) => client.queryUnshippedThirdPartyOrders({ ...query, delyGb, delyTemp })),
        ),
      ),
    ]);
    return mapMomoUnshippedOrders([...storeOrders.flat(), ...thirdPartyOrders.flat()]);
  };

  const fetchShipping = async (client: MomoScmClient, query: PlatformOrderQuery) => {
    const [storeOrders, thirdPartyOrders] = await Promise.all([
      Promise.all(
        queriedStoreDeliveryTypes(query).flatMap((delyGb) =>
          selectedOrAll(shippingStoreStatuses, query.shippingStatus).map((status) =>
            client.queryShippingStoreOrders({ ...query, delyGb, status }),
          ),
        ),
      ),
      Promise.all(
        queriedThirdPartyDeliveryTypes(query).flatMap((logistics) =>
          selectedOrAll(shippingThirdPartyStatuses, query.shippingStatus).map((status) =>
            client.queryShippingThirdPartyOrders({ ...query, logistics, status }),
          ),
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
    async fetchSalesStatistics(query) {
      // 專用的接單統計 API：查無資料時就是零，不能退回去查出貨相關 API，
      // 否則總覽的營收會混進另一種口徑（售價 vs 進價）的數字。
      return mapMomoSalesStatistics(await createClient().queryOrderGoodsStatistics(query));
    },
    async fetchPendingShipmentCount(query) {
      // 未指定配送類型與超商別時，fetchUnshipped 會查完全部已串接的組合。
      return (await fetchUnshipped(createClient(), query)).length;
    },
  };
}

export const momoConnector = createMomoConnector();

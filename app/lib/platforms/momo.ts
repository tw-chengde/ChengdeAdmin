import type {
  ShipmentBatchResult,
  ShipmentCandidate,
  ShipmentDocument,
  ShipmentOrderResult,
  ShipmentQuery,
  ShipmentRequest,
} from "@/app/types/shipment";
import { allowedValuesFromEnvironment } from "./config";
import type { PlatformConnector, PlatformOrderQuery } from "./connector";
import { MOMO_SHIPPING_STATUS_OPTIONS, MOMO_STORE_DELIVERY_TYPE_OPTIONS, momoDefinition } from "./definitions";
import { mapMomoSalesStatistics, mapMomoShippingOrders, mapMomoUnshippedOrders } from "./momo-order-mapper";
import { mapMomoGoodsBasicData } from "./momo-product-mapper";
import { mapMomoShipmentCandidates } from "./momo-shipment-mapper";
import { MomoScmClient, type MomoPackaging, type MomoThirdPartyOrderQuery } from "./momo-scm-client";
import type { ListingStatusFilter } from "./product";
import { classifyPrintPayload, dedupeByOrderNo, planComboBoxes, resolveMomoOrderStates } from "@/app/utils/shipment";

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
    async fetchPickingSheetOrders(query) {
      return fetchUnshipped(createClient(), query);
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
    async fetchShipmentCandidates(query: ShipmentQuery): Promise<ShipmentCandidate[]> {
      const client = createClient();
      const { deliveryTypes, temperatureTypes } = thirdPartyScope();

      const [storeGroups, thirdPartyGroups] = await Promise.all([
        Promise.all(storeDeliveryTypes.map((delyGb) => client.queryUnshippedStoreOrders({ ...query, delyGb }))),
        Promise.all(
          deliveryTypes.flatMap((delyGb) => temperatureTypes.map((delyTemp) => client.queryUnshippedThirdPartyOrders({ ...query, delyGb, delyTemp }))),
        ),
      ]);

      const storeCandidates = mapMomoShipmentCandidates(storeGroups.flat(), "MOMO_MAIN:STORE");
      // 每個 (delyGb, delyTemp) 組合各自映射，才能把 delyGb 標記回候選訂單（列印時要依物流商分組）。
      const delyGbPerGroup = deliveryTypes.flatMap((delyGb) => temperatureTypes.map(() => delyGb));
      const thirdPartyCandidates = dedupeByOrderNo(
        thirdPartyGroups.flatMap((rows, index) => mapMomoShipmentCandidates(rows, "MOMO_MAIN:THIRD_PARTY", delyGbPerGroup[index])),
      );

      return [...storeCandidates, ...thirdPartyCandidates];
    },
    async shipBatch(request: ShipmentRequest): Promise<ShipmentBatchResult> {
      const isStore = request.routeId === "MOMO_MAIN:STORE";
      const client = createClient();
      const results: ShipmentOrderResult[] = [];
      const documents: ShipmentDocument[] = [];

      const boxYnByOrderNo = planComboBoxes(request.candidates, isStore ? "STORE" : "THIRD_PARTY", request.bindings, request.products);
      const combineResult = isStore
        ? await client.combineStoreBoxes(boxYnByOrderNo)
        : await client.combineThirdPartyBoxes(boxYnByOrderNo);

      const parseOrderNoList = (entries: string[] | undefined) =>
        (entries ?? []).map((entry) => entry.split(":")[0]?.trim()).filter((orderNo): orderNo is string => Boolean(orderNo));

      // 併箱失敗、或箱號重複（combineUsedList，代表指派的箱號已被用過）的訂單都不進入後續階段（列印／出貨確認）。
      const combineFailedOrderNos = new Set(parseOrderNoList(combineResult.combineFailList));
      for (const orderNo of combineFailedOrderNos) {
        results.push({ orderNo, state: "FAILED", message: "併箱失敗，未送出出貨確認" });
      }
      const combineUsedOrderNos = new Set(parseOrderNoList(combineResult.combineUsedList).filter((orderNo) => !combineFailedOrderNos.has(orderNo)));
      for (const orderNo of combineUsedOrderNos) {
        results.push({ orderNo, state: "FAILED", message: "併箱箱號重複，未送出出貨確認" });
      }

      const proceeding = request.candidates.filter(
        (candidate) => !combineFailedOrderNos.has(candidate.orderNo) && !combineUsedOrderNos.has(candidate.orderNo),
      );
      if (proceeding.length === 0) return { routeId: request.routeId, results, documents };
      const proceedingOrderNos = proceeding.map((candidate) => candidate.orderNo);

      const packaging: MomoPackaging = {
        shipTypeStr: request.packaging?.shipPack ?? "",
        packTypeStr: request.packaging?.packType ?? "",
        packUnit: request.packaging?.packUnit ?? "",
      };
      const finishResults = isStore
        ? await client.finishStoreShipment(proceedingOrderNos, packaging)
        : await client.finishThirdPartyShipment(proceedingOrderNos, packaging);
      const states = resolveMomoOrderStates(proceedingOrderNos, finishResults);
      const printableOrderNos = proceedingOrderNos.filter((orderNo) => {
        const state = states.get(orderNo)?.state;
        return state === "SUCCESS" || state === "ALREADY_DONE";
      });
      const printWarningByOrderNo = new Map<string, string>();
      const recordPrintFailure = (orderNos: string[], documentName: string, error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        for (const orderNo of orderNos) printWarningByOrderNo.set(orderNo, `出貨成功，但${documentName}列印失敗：${detail}`);
      };

      if (isStore) {
        if (printableOrderNos.length > 0) {
          for (const { printType, name, documentName } of [
            { printType: "label" as const, name: "momo 超商取貨標籤", documentName: "標籤" },
            { printType: "dt" as const, name: "momo 超商取貨明細", documentName: "明細" },
          ]) {
            try {
              const printResult = await client.printStoreLabels(printableOrderNos, printType);
              if (printResult.pdfData) {
                const kind = classifyPrintPayload(printResult.pdfData);
                if (kind) {
                  documents.push({
                    platformCode: "MOMO_MAIN",
                    routeId: request.routeId,
                    name,
                    kind,
                    content: printResult.pdfData,
                    orderNos: printableOrderNos,
                  });
                }
              }
            } catch (error) {
              recordPrintFailure(printableOrderNos, documentName, error);
            }
          }
        }
      } else {
        // 第三方物流列印需指定物流商；同一物流商的訂單可透過 sendInfoList 一次列印。
        const orderNosByDelyGb = new Map<string, string[]>();
        for (const candidate of proceeding) {
          if (!printableOrderNos.includes(candidate.orderNo) || !candidate.thirdPartyDelyGb) continue;
          const orderNos = orderNosByDelyGb.get(candidate.thirdPartyDelyGb);
          if (orderNos) orderNos.push(candidate.orderNo);
          else orderNosByDelyGb.set(candidate.thirdPartyDelyGb, [candidate.orderNo]);
        }

        for (const [delyGb, orderNos] of orderNosByDelyGb) {
          for (const { printType, label } of [
            { printType: "label" as const, label: "標籤" },
            { printType: "dt" as const, label: "明細" },
            { printType: "all" as const, label: "出貨總表" },
          ]) {
            try {
              const printResult = await client.printThirdPartyLabels(delyGb as MomoThirdPartyOrderQuery["delyGb"], orderNos, printType);
              if (printResult.pdfData) {
                const kind = classifyPrintPayload(printResult.pdfData);
                if (kind) {
                  documents.push({
                    platformCode: "MOMO_MAIN",
                    routeId: request.routeId,
                    name: `momo 第三方物流${label}`,
                    kind,
                    content: printResult.pdfData,
                    orderNos,
                  });
                }
              }
            } catch (error) {
              recordPrintFailure(orderNos, label, error);
            }
          }
        }
      }

      for (const orderNo of proceedingOrderNos) {
        const resolved = states.get(orderNo)!;
        const message = [resolved.message, printWarningByOrderNo.get(orderNo)].filter(Boolean).join("；") || undefined;
        results.push({ orderNo, state: resolved.state, message });
      }

      return { routeId: request.routeId, results, documents };
    },
  };
}

export const momoConnector = createMomoConnector();

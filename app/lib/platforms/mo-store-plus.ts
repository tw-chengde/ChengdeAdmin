import type {
  ShipmentBatchResult,
  ShipmentCandidate,
  ShipmentDocument,
  ShipmentOrderResult,
  ShipmentQuery,
  ShipmentRequest,
} from "@/app/types/shipment";
import { classifyPrintPayload, planComboBoxes } from "@/app/utils/shipment";
import { isPendingShipmentStatus } from "@/app/types/order";
import type { PlatformConnector } from "./connector";
import { moStorePlusDefinition } from "./definitions";
import { MoStorePlusClient, type MoStorePlusDeliveryPackage, type MoStorePlusOrderRef } from "./mo-store-plus-client";
import { mapMoStorePlusOrders } from "./mo-store-plus-order-mapper";
import { mapMoStorePlusGoods } from "./mo-store-plus-product-mapper";
import { fixedRouteResolver, mapMoStorePlusShipmentCandidates, resolveStoreRouteByDeliveryCompany } from "./mo-store-plus-shipment-mapper";
import type { ListingStatusFilter } from "./product";
import { summarizeOrders, type PlatformSalesQuery } from "./sales";

/** 商品狀態查詢條件對應 mo店+ 的 saleStatus。 */
const saleStatusByListingStatus: Record<ListingStatusFilter, string> = {
  ALL: "All",
  LISTED: "StartSelling",
  DELISTED: "StopSelling",
};

/**
 * OrderQuery 的 orderStatus 只能擇一（無法一次查多狀態），
 * 而「待發貨」涵蓋 NotShipped／Printed 兩種平台狀態，因此揀貨單／出貨候選都要分開查再合併。
 */
const PENDING_SHIPMENT_ORDER_STATUSES = ["NotShipped", "Printed"] as const;

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
 * 以工廠而非直接匯出物件的形式提供，測試才能注入假的 client。
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
    async fetchPickingSheetOrders(query) {
      const client = createClient();
      const recordsByStatus = await Promise.all(
        PENDING_SHIPMENT_ORDER_STATUSES.map((orderStatus) =>
          client.fetchOrders({ ...query, orderStatus, deliveryType: "All", storeDeliveryType: "All" }),
        ),
      );
      const seenOrderNos = new Set<string>();
      const records = recordsByStatus.flat().filter((record) => {
        const orderNo = String(record.orderNo ?? "");
        if (seenOrderNos.has(orderNo)) return false;
        seenOrderNos.add(orderNo);
        return true;
      });
      return mapMoStorePlusOrders(records);
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
      return (await fetchAllOrders(query)).filter((order) => isPendingShipmentStatus(order.status)).length;
    },
    async fetchShipmentCandidates(query: ShipmentQuery): Promise<ShipmentCandidate[]> {
      const client = createClient();
      const [storeRecordsByStatus, thirdPartyRecordsByStatus] = await Promise.all([
        Promise.all(
          PENDING_SHIPMENT_ORDER_STATUSES.map((orderStatus) =>
            client.fetchOrders({ ...query, orderStatus, deliveryType: "Store", storeDeliveryType: "All" }),
          ),
        ),
        Promise.all(
          PENDING_SHIPMENT_ORDER_STATUSES.map((orderStatus) =>
            client.fetchOrders({ ...query, orderStatus, deliveryType: "ThirdParty" }),
          ),
        ),
      ]);

      const candidates = [
        ...mapMoStorePlusShipmentCandidates(storeRecordsByStatus.flat(), resolveStoreRouteByDeliveryCompany),
        ...mapMoStorePlusShipmentCandidates(thirdPartyRecordsByStatus.flat(), fixedRouteResolver("MO_STORE_PLUS:THIRD_PARTY")),
      ];
      return [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
    },
    async shipBatch(request: ShipmentRequest): Promise<ShipmentBatchResult> {
      const client = createClient();
      const results: ShipmentOrderResult[] = [];
      const documents: ShipmentDocument[] = [];
      const seenOrderNos = new Set<string>();
      const markMissingResults = () => {
        for (const candidate of request.candidates) {
          if (seenOrderNos.has(candidate.orderNo)) continue;
          seenOrderNos.add(candidate.orderNo);
          results.push({ orderNo: candidate.orderNo, state: "FAILED", message: "平台未回傳此訂單的出貨結果。" });
        }
      };

      // 一張訂單一個 package；同一併箱群組必須帶相同的三位箱號。
      const packageOf = (candidate: ShipmentCandidate, newBoxYn = "001"): MoStorePlusDeliveryPackage => ({
        newBoxYn,
        deliveryStatus: "Shipped",
        orderList: (candidate.orderSeqs.length ? candidate.orderSeqs : [""]).map(
          (orderSeq): MoStorePlusOrderRef => ({ orderNo: candidate.orderNo, orderSeq }),
        ),
      });

      const recordResults = (
        items: ReadonlyArray<{
          orderNo?: string;
          orderList?: MoStorePlusOrderRef[];
          success?: boolean;
          message?: string;
          slipNo?: string;
          printLabel?: string;
          printDetail?: string;
          printAll?: string;
        }>,
        printableDocuments: ReadonlyArray<{ name: string; field: "printLabel" | "printDetail" | "printAll" }>,
      ) => {
        for (const item of items) {
          const orderNos = item.orderList?.map((orderRef) => orderRef.orderNo) ?? (item.orderNo ? [item.orderNo] : []);
          for (const orderNo of orderNos) {
            if (seenOrderNos.has(orderNo)) continue;
            seenOrderNos.add(orderNo);
            results.push({
              orderNo,
              state: item.success ? "SUCCESS" : "FAILED",
              message: item.message,
              ...(item.slipNo ? { trackingNo: item.slipNo } : {}),
            });
          }
          for (const document of printableDocuments) {
            const payload = item[document.field];
            if (payload) {
              const kind = classifyPrintPayload(payload);
              if (kind) {
                documents.push({
                  platformCode: "MO_STORE_PLUS",
                  routeId: request.routeId,
                  name: document.name,
                  kind,
                  content: payload,
                  orderNos,
                });
              }
            }
          }
        }
      };

      if (request.routeId === "MO_STORE_PLUS:THIRD_PARTY") {
        const mergeGroupByOrderNo = planComboBoxes(request.candidates, "THIRD_PARTY", request.bindings, request.products);
        const boxNoByGroup = new Map<string, string>();
        let nextBoxNo = 1;
        const packages = request.candidates.map((candidate) => {
          const mergeGroup = mergeGroupByOrderNo.get(candidate.orderNo) ?? "00";
          // `00` 代表不併箱，故每筆訂單要有獨立的箱號；其他群組則同客戶、同群組共用箱號。
          const groupKey = mergeGroup === "00" ? `single:${candidate.orderNo}` : `merged:${candidate.custId ?? ""}:${mergeGroup}`;
          let newBoxYn = boxNoByGroup.get(groupKey);
          if (!newBoxYn) {
            newBoxYn = String(nextBoxNo).padStart(3, "0");
            nextBoxNo += 1;
            boxNoByGroup.set(groupKey, newBoxYn);
          }
          return packageOf(candidate, newBoxYn);
        });
        const confirmResults = await client.confirmThirdPartyDelivery(packages);
        recordResults(confirmResults, [
          { name: "店+ 第三方物流標籤", field: "printLabel" },
          { name: "店+ 第三方物流出貨明細", field: "printDetail" },
          { name: "店+ 第三方物流出貨總表", field: "printAll" },
        ]);
        markMissingResults();
        return { routeId: request.routeId, results, documents };
      }

      const isSeven = request.routeId === "MO_STORE_PLUS:STORE:1";
      // 與 resolveStoreDelyGb 一致，假設倉到店（見 ShipmentCandidate.storeDelyGb 的說明）。
      const defaultDelyGb = isSeven ? "21" : "27";
      // 店+ 的 OrderQuery 沒有客戶 ID／門市代碼欄位，無法像 momo 一樣判斷「同門市同客」才可併箱，
      // 因此超商路徑每筆訂單各自獨立箱號，不嘗試併箱（併錯箱比不併箱更危險）。
      let nextBoxNo = 1;
      const packagesByDelyGb = new Map<string, MoStorePlusDeliveryPackage[]>();
      for (const candidate of request.candidates) {
        const delyGb = candidate.storeDelyGb ?? defaultDelyGb;
        const bucket = packagesByDelyGb.get(delyGb);
        const pkg = packageOf(candidate, String(nextBoxNo).padStart(3, "0"));
        nextBoxNo += 1;
        if (bucket) bucket.push(pkg);
        else packagesByDelyGb.set(delyGb, [pkg]);
      }

      for (const [delyGb, groupPackages] of packagesByDelyGb) {
        const confirmResults = isSeven
          ? await client.confirmSevenStoreDelivery(delyGb as "21" | "22", groupPackages)
          : await client.confirmFamilyStoreDelivery(delyGb as "29" | "27" | "24" | "23", groupPackages);
        recordResults(confirmResults, [
          { name: isSeven ? "店+ 7-11 出貨標籤" : "店+ 全家出貨標籤", field: "printLabel" },
          { name: isSeven ? "店+ 7-11 出貨明細" : "店+ 全家出貨明細", field: "printDetail" },
        ]);
      }

      markMissingResults();
      return { routeId: request.routeId, results, documents };
    },
  };
}

export const moStorePlusConnector = createMoStorePlusConnector();

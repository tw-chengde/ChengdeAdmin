import assert from "node:assert/strict";
import { test } from "vitest";
import { createMomoConnector } from "@/app/lib/platforms/momo";
import { MomoScmClient } from "@/app/lib/platforms/momo-scm-client";
import { createMoStorePlusConnector } from "@/app/lib/platforms/mo-store-plus";
import { MoStorePlusClient } from "@/app/lib/platforms/mo-store-plus-client";
import type { ShipmentCandidate } from "@/app/types/shipment";

const packaging = { shipPack: "紙箱", packType: "標準", packUnit: "1" };

function momoStoreCandidate(orderNo: string): ShipmentCandidate {
  return {
    id: `MOMO_MAIN:MOMO_MAIN:STORE:${orderNo}`,
    platformCode: "MOMO_MAIN",
    routeId: "MOMO_MAIN:STORE",
    orderNo,
    orderSeqs: [],
    receiverName: "客戶",
    createdAt: "2026-08-01T00:00:00.000Z",
    items: [],
    totalQty: 1,
    logistics: "",
  };
}

test("momo shipBatch 依序呼叫 combineBox → finish → printPdf", async () => {
  const callOrder: string[] = [];
  const printTypes: string[] = [];
  const client = new MomoScmClient({
    credentials: { entpId: "1", entpCode: "2", entpPassword: "3", otpBackNo: "4" },
    fetchImpl: async (input, init) => {
      const body = JSON.parse(String(init?.body)) as { doAction?: string; printType?: string };
      const step = body.doAction ?? String(input);
      callOrder.push(step);
      if (step === "unsendStoresPrintPdf") printTypes.push(body.printType ?? "");
      if (step === "unsendStoresCombineBox") return new Response(JSON.stringify({ resultInfo: { combineOkCnt: "1" } }));
      if (step === "unsendStoresPrintPdf") return new Response(JSON.stringify({ pdfData: "JVBERi0xLjQ=" }));
      if (step === "unsendStoresFinish") return new Response(JSON.stringify({ resultInfo: [{ confirmOkList: ["A1"] }] }));
      return new Response(JSON.stringify({}));
    },
  });
  const connector = createMomoConnector({ createClient: () => client });

  const result = await connector.shipBatch!({
    routeId: "MOMO_MAIN:STORE",
    candidates: [momoStoreCandidate("A1")],
    packaging,
    bindings: [],
    products: [],
  });

  assert.deepEqual(callOrder, ["unsendStoresCombineBox", "unsendStoresFinish", "unsendStoresPrintPdf", "unsendStoresPrintPdf"]);
  assert.deepEqual(printTypes, ["label", "dt"]);
  assert.deepEqual(result.results, [{ orderNo: "A1", state: "SUCCESS", message: undefined }]);
  assert.deepEqual(
    result.documents.map((document) => document.name),
    ["momo 超商取貨標籤", "momo 超商取貨明細"],
  );
});

test("momo 第三方物流出貨依序列印標籤、明細與出貨總表", async () => {
  const printTypes: string[] = [];
  const client = new MomoScmClient({
    credentials: { entpId: "1", entpCode: "2", entpPassword: "3", otpBackNo: "4" },
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { doAction?: string; printType?: string };
      if (body.doAction === "unsendThirdCombineBox") return new Response(JSON.stringify({ resultInfo: { combineOkCnt: "1" } }));
      if (body.doAction === "unsendThirdFinish") return new Response(JSON.stringify({ resultInfo: { confirmOkList: ["A1"] } }));
      if (body.doAction === "unsendThirdPrintPdf") {
        printTypes.push(body.printType ?? "");
        return new Response(JSON.stringify({ pdfData: "JVBERi0xLjQ=" }));
      }
      return new Response(JSON.stringify({}));
    },
  });
  const connector = createMomoConnector({ createClient: () => client });
  const candidate = { ...momoStoreCandidate("A1"), routeId: "MOMO_MAIN:THIRD_PARTY" as const, thirdPartyDelyGb: "61" };

  const result = await connector.shipBatch!({
    routeId: "MOMO_MAIN:THIRD_PARTY",
    candidates: [candidate],
    packaging,
    bindings: [],
    products: [],
  });

  assert.deepEqual(printTypes, ["label", "dt", "all"]);
  assert.deepEqual(
    result.documents.map((document) => document.name),
    ["momo 第三方物流標籤", "momo 第三方物流明細", "momo 第三方物流出貨總表"],
  );
});

test("momo shipBatch：併箱失敗的訂單不進入列印／出貨確認，直接標記失敗", async () => {
  const printCalls: unknown[] = [];
  const finishCalls: unknown[] = [];
  const client = new MomoScmClient({
    credentials: { entpId: "1", entpCode: "2", entpPassword: "3", otpBackNo: "4" },
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { doAction?: string; sendInfoList?: unknown };
      if (body.doAction === "unsendStoresCombineBox") {
        return new Response(JSON.stringify({ resultInfo: { combineFailCnt: "1", combineFailList: ["A1 : 門市代碼失效"] } }));
      }
      if (body.doAction === "unsendStoresPrintPdf") {
        printCalls.push(body.sendInfoList);
        return new Response(JSON.stringify({ pdfData: "JVBERi0xLjQ=" }));
      }
      if (body.doAction === "unsendStoresFinish") {
        finishCalls.push(body.sendInfoList);
        return new Response(JSON.stringify({ resultInfo: [{ confirmOkList: ["A2"] }] }));
      }
      return new Response(JSON.stringify({}));
    },
  });
  const connector = createMomoConnector({ createClient: () => client });

  const result = await connector.shipBatch!({
    routeId: "MOMO_MAIN:STORE",
    candidates: [momoStoreCandidate("A1"), momoStoreCandidate("A2")],
    packaging,
    bindings: [],
    products: [],
  });

  assert.deepEqual(result.results.find((r) => r.orderNo === "A1"), {
    orderNo: "A1",
    state: "FAILED",
    message: "併箱失敗，未送出出貨確認",
  });
  assert.deepEqual(result.results.find((r) => r.orderNo === "A2"), { orderNo: "A2", state: "SUCCESS", message: undefined });
  // A1 不該出現在後續列印／出貨確認的請求裡。
  assert.deepEqual(printCalls, [[{ completeOrderNo: "A2" }], [{ completeOrderNo: "A2" }]]);
  assert.deepEqual((finishCalls[0] as Array<{ completeOrderNo: string }>).map((item) => item.completeOrderNo), ["A2"]);
});

test("momo shipBatch：箱號重複（combineUsedList）的訂單同樣不進入列印／出貨確認", async () => {
  const finishCalls: unknown[] = [];
  const client = new MomoScmClient({
    credentials: { entpId: "1", entpCode: "2", entpPassword: "3", otpBackNo: "4" },
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { doAction?: string; sendInfoList?: unknown };
      if (body.doAction === "unsendStoresCombineBox") {
        return new Response(JSON.stringify({ resultInfo: { combineUsedCnt: "1", combineUsedList: ["A1 : 箱號重複"] } }));
      }
      if (body.doAction === "unsendStoresFinish") {
        finishCalls.push(body.sendInfoList);
        return new Response(JSON.stringify({ resultInfo: [{ confirmOkList: ["A2"] }] }));
      }
      return new Response(JSON.stringify({ pdfData: "JVBERi0xLjQ=" }));
    },
  });
  const connector = createMomoConnector({ createClient: () => client });

  const result = await connector.shipBatch!({
    routeId: "MOMO_MAIN:STORE",
    candidates: [momoStoreCandidate("A1"), momoStoreCandidate("A2")],
    packaging,
    bindings: [],
    products: [],
  });

  assert.deepEqual(result.results.find((r) => r.orderNo === "A1"), {
    orderNo: "A1",
    state: "FAILED",
    message: "併箱箱號重複，未送出出貨確認",
  });
  assert.deepEqual(result.results.find((r) => r.orderNo === "A2"), { orderNo: "A2", state: "SUCCESS", message: undefined });
  assert.deepEqual((finishCalls[0] as Array<{ completeOrderNo: string }>).map((item) => item.completeOrderNo), ["A2"]);
});

function storeCandidate(routeId: "MO_STORE_PLUS:STORE:1" | "MO_STORE_PLUS:STORE:2", orderNo: string): ShipmentCandidate {
  return {
    id: `MO_STORE_PLUS:${routeId}:${orderNo}`,
    platformCode: "MO_STORE_PLUS",
    routeId,
    orderNo,
    orderSeqs: ["001"],
    receiverName: "客戶",
    createdAt: "2026-08-01",
    items: [],
    totalQty: 1,
    logistics: "",
    storeDelyGb: routeId === "MO_STORE_PLUS:STORE:1" ? "22" : "29",
  };
}

test("店+ shipBatch：7-11 與全家打到不同端點", async () => {
  const urls: string[] = [];
  const client = new MoStorePlusClient({
    fetchImpl: async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ confirmDeliveryDetailResList: [{ orderList: [{ orderNo: "S1", orderSeq: "001" }], success: true }] }));
    },
  });
  const connector = createMoStorePlusConnector({ createClient: () => client });

  await connector.shipBatch!({
    routeId: "MO_STORE_PLUS:STORE:1",
    candidates: [storeCandidate("MO_STORE_PLUS:STORE:1", "S1")],
    packaging: null,
    bindings: [],
    products: [],
  });
  await connector.shipBatch!({
    routeId: "MO_STORE_PLUS:STORE:2",
    candidates: [storeCandidate("MO_STORE_PLUS:STORE:2", "F1")],
    packaging: null,
    bindings: [],
    products: [],
  });

  assert.equal(urls[0], "https://api3p.momo.com.tw/VendorApi/OrderShippingStatusConfirmSevenStoreDelivery");
  assert.equal(urls[1], "https://api3p.momo.com.tw/VendorApi/OrderShippingStatusConfirmFamilyStoreDelivery");
});

test("mo store plus convenience-store shipment provides label and detail documents", async () => {
  const client = new MoStorePlusClient({
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          confirmDeliveryDetailResList: [
            {
              orderList: [{ orderNo: "S1", orderSeq: "001" }],
              success: true,
              printLabel: "https://example.com/store-label.pdf",
              printDetail: "https://example.com/store-detail.pdf",
            },
          ],
        }),
      ),
  });
  const connector = createMoStorePlusConnector({ createClient: () => client });

  const result = await connector.shipBatch!({
    routeId: "MO_STORE_PLUS:STORE:1",
    candidates: [storeCandidate("MO_STORE_PLUS:STORE:1", "S1")],
    packaging: null,
    bindings: [],
    products: [],
  });

  assert.deepEqual(
    result.documents.map((document) => ({ name: document.name, content: document.content })),
    [
      { name: "店+ 7-11 出貨標籤", content: "https://example.com/store-label.pdf" },
      { name: "店+ 7-11 出貨明細", content: "https://example.com/store-detail.pdf" },
    ],
  );
});

test("店+ shipBatch：第三方物流提供標籤、明細與出貨總表三份文件", async () => {
  const client = new MoStorePlusClient({
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          confirmDeliveryDetailResList: [
            {
              orderList: [{ orderNo: "T1", orderSeq: "001" }],
              success: true,
              slipNo: "SLIP-1",
              printLabel: "https://example.com/label.pdf",
              printDetail: "https://example.com/detail.pdf",
              printAll: "JVBERi0xLjQ=",
            },
          ],
        }),
      ),
  });
  const connector = createMoStorePlusConnector({ createClient: () => client });

  const result = await connector.shipBatch!({
    routeId: "MO_STORE_PLUS:THIRD_PARTY",
    candidates: [
      {
        id: "MO_STORE_PLUS:MO_STORE_PLUS:THIRD_PARTY:T1",
        platformCode: "MO_STORE_PLUS",
        routeId: "MO_STORE_PLUS:THIRD_PARTY",
        orderNo: "T1",
        orderSeqs: ["001"],
        receiverName: "客戶",
        createdAt: "2026-08-01",
        items: [],
        totalQty: 1,
        logistics: "",
      },
    ],
    packaging: null,
    bindings: [],
    products: [],
  });

  assert.equal(result.results[0]?.trackingNo, "SLIP-1");
  assert.deepEqual(
    result.documents.map((document) => ({ name: document.name, content: document.content })),
    [
      { name: "店+ 第三方物流標籤", content: "https://example.com/label.pdf" },
      { name: "店+ 第三方物流出貨明細", content: "https://example.com/detail.pdf" },
      { name: "店+ 第三方物流出貨總表", content: "JVBERi0xLjQ=" },
    ],
  );
});

test("mo store plus third-party shipment sends a three-digit merge-box number for each order", async () => {
  let sentPackages: Array<{ newBoxYn?: string; orderList?: Array<{ orderNo?: string }> }> = [];
  const client = new MoStorePlusClient({
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { listItem?: typeof sentPackages };
      sentPackages = body.listItem ?? [];
      return new Response(
        JSON.stringify({
          confirmDeliveryDetailResList: [
            { orderList: [{ orderNo: "T1", orderSeq: "001" }], success: true },
            { orderList: [{ orderNo: "T2", orderSeq: "001" }], success: true },
            { orderList: [{ orderNo: "T3", orderSeq: "001" }], success: true },
          ],
        }),
      );
    },
  });
  const connector = createMoStorePlusConnector({ createClient: () => client });

  await connector.shipBatch!({
    routeId: "MO_STORE_PLUS:THIRD_PARTY",
    candidates: ["T1", "T2", "T3"].map((orderNo) => ({
      id: `MO_STORE_PLUS:MO_STORE_PLUS:THIRD_PARTY:${orderNo}`,
      platformCode: "MO_STORE_PLUS" as const,
      routeId: "MO_STORE_PLUS:THIRD_PARTY" as const,
      orderNo,
      orderSeqs: ["001"],
      receiverName: "receiver",
      createdAt: "2026-08-01",
      items: [],
      totalQty: 1,
      logistics: "",
      custId: orderNo === "T3" ? "C2" : "C1",
    })),
    packaging: null,
    bindings: [],
    products: [],
  });

  assert.deepEqual(
    sentPackages.map((item) => ({ newBoxYn: item.newBoxYn, orderNo: item.orderList?.[0]?.orderNo })),
    [
      { newBoxYn: "001", orderNo: "T1" },
      { newBoxYn: "001", orderNo: "T2" },
      { newBoxYn: "002", orderNo: "T3" },
    ],
  );
});

test("mo store plus third-party result maps the documented orderNo/orderSeq response", async () => {
  const client = new MoStorePlusClient({
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          confirmDeliveryDetailResList: [{ orderNo: "T1", orderSeq: "001", success: true, message: "" }],
        }),
      ),
  });
  const connector = createMoStorePlusConnector({ createClient: () => client });

  const result = await connector.shipBatch!({
    routeId: "MO_STORE_PLUS:THIRD_PARTY",
    candidates: [
      {
        id: "MO_STORE_PLUS:MO_STORE_PLUS:THIRD_PARTY:T1",
        platformCode: "MO_STORE_PLUS",
        routeId: "MO_STORE_PLUS:THIRD_PARTY",
        orderNo: "T1",
        orderSeqs: ["001"],
        receiverName: "receiver",
        createdAt: "2026-08-01",
        items: [],
        totalQty: 1,
        logistics: "",
      },
    ],
    packaging: null,
    bindings: [],
    products: [],
  });

  assert.deepEqual(result.results, [{ orderNo: "T1", state: "SUCCESS", message: "" }]);
});

test("momo third-party shipment groups every print type by logistics provider", async () => {
  const printRequests: Array<{ delyGb?: string; orderNos?: string[]; printType?: string }> = [];
  const client = new MomoScmClient({
    credentials: { entpId: "1", entpCode: "2", entpPassword: "3", otpBackNo: "4" },
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        doAction?: string;
        third_delyGb?: string;
        printType?: string;
        sendInfoList?: Array<{ completeOrderNo?: string }>;
      };
      if (body.doAction === "unsendThirdCombineBox") return new Response(JSON.stringify({ resultInfo: {} }));
      if (body.doAction === "unsendThirdPrintPdf") {
        printRequests.push({
          delyGb: body.third_delyGb,
          orderNos: body.sendInfoList?.map((item) => item.completeOrderNo ?? ""),
          printType: body.printType,
        });
        return new Response(JSON.stringify({ pdfData: "JVBERi0xLjQ=" }));
      }
      if (body.doAction === "unsendThirdFinish") return new Response(JSON.stringify({ resultInfo: { confirmOkList: ["A1", "A2", "A3"] } }));
      return new Response(JSON.stringify({}));
    },
  });
  const connector = createMomoConnector({ createClient: () => client });
  const candidates = ["A1", "A2", "A3"].map((orderNo) => ({
    ...momoStoreCandidate(orderNo),
    routeId: "MOMO_MAIN:THIRD_PARTY" as const,
    thirdPartyDelyGb: orderNo === "A3" ? "63" : "62",
  }));

  await connector.shipBatch!({ routeId: "MOMO_MAIN:THIRD_PARTY", candidates, packaging, bindings: [], products: [] });

  assert.deepEqual(printRequests, [
    { delyGb: "62", orderNos: ["A1", "A2"], printType: "label" },
    { delyGb: "62", orderNos: ["A1", "A2"], printType: "dt" },
    { delyGb: "62", orderNos: ["A1", "A2"], printType: "all" },
    { delyGb: "63", orderNos: ["A3"], printType: "label" },
    { delyGb: "63", orderNos: ["A3"], printType: "dt" },
    { delyGb: "63", orderNos: ["A3"], printType: "all" },
  ]);
});

test("momo third-party shipment keeps confirmed orders successful when label printing fails", async () => {
  const client = new MomoScmClient({
    credentials: { entpId: "1", entpCode: "2", entpPassword: "3", otpBackNo: "4" },
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { doAction?: string };
      if (body.doAction === "unsendThirdCombineBox") return new Response(JSON.stringify({ resultInfo: {} }));
      if (body.doAction === "unsendThirdFinish") return new Response(JSON.stringify({ resultInfo: { confirmOkList: ["A1"] } }));
      if (body.doAction === "unsendThirdPrintPdf") return new Response(JSON.stringify({ ERROR: "列印服務暫時無法使用" }));
      return new Response(JSON.stringify({}));
    },
  });
  const connector = createMomoConnector({ createClient: () => client });

  const result = await connector.shipBatch!({
    routeId: "MOMO_MAIN:THIRD_PARTY",
    candidates: [{ ...momoStoreCandidate("A1"), routeId: "MOMO_MAIN:THIRD_PARTY", thirdPartyDelyGb: "62" }],
    packaging,
    bindings: [],
    products: [],
  });

  assert.deepEqual(result.results, [
    {
      orderNo: "A1",
      state: "SUCCESS",
      message: "出貨成功，但出貨總表列印失敗：momo SCM 第三方物流列印失敗：列印服務暫時無法使用",
    },
  ]);
  assert.deepEqual(result.documents, []);
});

test("mo store plus candidates include both NotShipped and Printed orders", async () => {
  const requestedStatuses: string[] = [];
  const client = new MoStorePlusClient({
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { orderStatus: string };
      requestedStatuses.push(body.orderStatus);
      return new Response(JSON.stringify({ totalOrders: 0, listOrder: [] }));
    },
  });
  const connector = createMoStorePlusConnector({ createClient: () => client });

  await connector.fetchShipmentCandidates!({ from: new Date("2026-08-01"), to: new Date("2026-08-02") });

  // Store、ThirdParty 兩種配送類型各自要查 NotShipped／Printed 兩種狀態，才不會漏掉已印單但未出貨的訂單。
  assert.deepEqual(requestedStatuses.sort(), ["NotShipped", "NotShipped", "Printed", "Printed"]);
});

test("momo picking sheet queries unshipped orders", async () => {
  const requests: Array<{ doAction?: string; sendInfo?: { status?: string } }> = [];
  const client = new MomoScmClient({
    credentials: { entpId: "1", entpCode: "2", entpPassword: "3", otpBackNo: "4" },
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { doAction?: string; sendInfo?: { status?: string } };
      requests.push(body);
      return new Response(
        JSON.stringify({
          dataList:
            body.doAction === "unsendThirdQuery"
              ? [{ completeOrderNo: "MOMO-UNSHIPPED", goods_name: "保溫瓶", syslast: "1" }]
              : [],
        }),
      );
    },
  });
  const connector = createMomoConnector({ createClient: () => client });

  const orders = await connector.fetchPickingSheetOrders({ from: new Date("2026-08-01"), to: new Date("2026-08-02") });

  assert.ok(requests.length > 0);
  assert.ok(requests.every((request) => request.doAction === "unsendStoresQuery" || request.doAction === "unsendThirdQuery"));
  assert.ok(requests.every((request) => request.sendInfo?.status === undefined));
  assert.deepEqual(orders.map((order) => ({ orderNo: order.orderNo, status: order.status })), [{ orderNo: "MOMO-UNSHIPPED", status: "待發貨" }]);
});

test("mo store plus picking sheet queries both NotShipped and Printed orders", async () => {
  const requestedStatuses: string[] = [];
  const client = new MoStorePlusClient({
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { orderStatus: string };
      requestedStatuses.push(body.orderStatus);
      return new Response(
        JSON.stringify({
          totalOrders: 1,
          listOrder: [{ orderNo: "STORE-UNSHIPPED", listItem: [{ itemStatus: "出貨通知(已付款)", goodsName: "保溫瓶", quantity: 1, orderAmount: 100 }] }],
        }),
      );
    },
  });
  const connector = createMoStorePlusConnector({ createClient: () => client });

  const orders = await connector.fetchPickingSheetOrders({ from: new Date("2026-08-01"), to: new Date("2026-08-02") });

  assert.deepEqual(requestedStatuses.sort(), ["NotShipped", "Printed"]);
  // 兩次查詢重複回傳同一筆訂單，去重後只應出現一次。
  assert.deepEqual(orders.map((order) => ({ orderNo: order.orderNo, status: order.status })), [{ orderNo: "STORE-UNSHIPPED", status: "待發貨" }]);
});

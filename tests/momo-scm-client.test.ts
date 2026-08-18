import assert from "node:assert/strict";
import { test } from "vitest";
import type { PlatformOrderQuery } from "@/app/lib/platforms/connector";
import { createMomoConnector, type MomoConnectorOptions } from "@/app/lib/platforms/momo";
import { mapMomoGoodsBasicData } from "@/app/lib/platforms/momo-product-mapper";
import { MomoScmClient } from "@/app/lib/platforms/momo-scm-client";

const credentials = {
  entpId: "12345678",
  entpCode: "001005",
  entpPassword: "supplier-password",
  otpBackNo: "123",
};

const dateRange = {
  from: new Date("2026-08-01T00:00:00+08:00"),
  to: new Date("2026-08-01T01:00:00+08:00"),
};

test("momo SCM queries unshipped store-pickup orders with the documented payload", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        dataList: [{
          completeOrderNo: "STORE-001",
          goodsName: "Store item",
          goodsDtInfo: "Blue",
          syslast: "2",
          salePrice: "150",
          Receiver: "Jane",
          storeIdName: "Store A",
          lastPricDate: "2026/08/01 10:00",
        }],
      }));
    },
  });

  const rows = await client.queryUnshippedStoreOrders({ ...dateRange, delyGb: "21" });

  assert.equal(requestBody?.doAction, "unsendStoresQuery");
  assert.deepEqual(requestBody?.loginInfo, {
    entpID: credentials.entpId,
    entpCode: credentials.entpCode,
    entpPwd: credentials.entpPassword,
    otpBackNo: credentials.otpBackNo,
  });
  assert.deepEqual(requestBody?.sendInfo, {
    stores_fr_dd: "2026/08/01",
    stores_fr_hh: "00",
    stores_fr_mm: "00",
    stores_to_dd: "2026/08/01",
    stores_to_hh: "01",
    stores_to_mm: "00",
    stores_receiver: "",
    stores_goodsCode: "",
    stores_orderNo: "",
    stores_entpGoodsNo: "",
    stores_special: "N",
    dely_gb: "21",
  });
  assert.deepEqual(rows.map((row) => row.completeOrderNo), ["STORE-001"]);
});

test("momo SCM queries unshipped third-party orders with the documented payload", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        dataList: [{
          completeOrderNo: "THIRD-001",
          goodsName: "Third-party item",
          goodsDtInfo: "Large",
          syslast: "1",
          salePrice: "880",
          receiverMask: "Jo*n",
          receiverAddrMask: "Taipei City",
          orderDelyGbName: "Carrier A",
          scm_msg: "Delivery note",
          lastPricDate: "2026/08/01 10:30",
        }],
      }));
    },
  });

  const rows = await client.queryUnshippedThirdPartyOrders({ ...dateRange, delyGb: "61", delyTemp: "01" });

  assert.equal(requestBody?.doAction, "unsendThirdQuery");
  assert.deepEqual(requestBody?.sendInfo, {
    third_fr_dd: "2026/08/01",
    third_fr_hh: "00",
    third_fr_mm: "00",
    third_to_dd: "2026/08/01",
    third_to_hh: "01",
    third_to_mm: "00",
    third_receiver: "",
    third_goodsCode: "",
    third_orderNo: "",
    third_entpGoodsNo: "",
    third_orderGb: "",
    third_delyGb: "61",
    third_delyTemp: "01",
  });
  assert.deepEqual(rows.map((row) => row.completeOrderNo), ["THIRD-001"]);
});

test("momo SCM queries shipping store-pickup orders with the documented payload", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        dataList: [{
          completeOrderNo: "SHIPPING-STORE-001",
          goods_name: "Shipping store item",
          goodsdt_info: "Blue",
          syslast: "1",
          receiver_mask: "Ja*e",
          storeName: "Store A",
          storeId: "123456",
          slip_no: "SLIP-001",
          create_date: "2026/08/01 10:00",
          code_name: "已印單未到貨",
        }],
      }));
    },
  });

  const rows = await client.queryShippingStoreOrders({ ...dateRange, delyGb: "21", status: "2" });

  assert.equal(requestBody?.doAction, "sendingStoresQuery");
  assert.deepEqual(requestBody?.sendInfo, {
    fromDate: "2026/08/01",
    fromHour: "00",
    fromMinute: "00",
    toDate: "2026/08/01",
    toHour: "01",
    toMinute: "00",
    qryGoodsCode: "",
    receiver: "",
    orderNo: "",
    entpGoodsCode: "",
    status: "2",
    dely_gb: "21",
  });
  // 回應本身不含超商別，client 要把查詢用的 delyGb 補進每一列，mapper 才對應得到超商品牌。
  assert.deepEqual(rows.map((row) => row.storeDeliveryType), ["21"]);
});

test("momo SCM queries shipping third-party orders with the documented payload", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        dataList: [{ completeOrderNo: "SHIPPING-THIRD-001", code_name: "已印單" }],
      }));
    },
  });

  const rows = await client.queryShippingThirdPartyOrders({ ...dateRange, logistics: "63", status: "1" });

  assert.equal(rows.length, 1);
  assert.equal(requestBody?.doAction, "sendingThirdQuery");
  assert.deepEqual(requestBody?.sendInfo, {
    fromDate: "2026/08/01",
    fromHour: "00",
    fromMinute: "00",
    toDate: "2026/08/01",
    toHour: "01",
    toMinute: "00",
    qryGoodsCode: "",
    receiver: "",
    status: "1",
    orderNo: "",
    logistics: "63",
    entpGoodsCode: "",
  });
});

type ConnectorScope = Omit<MomoConnectorOptions, "createClient">;
type RecordedRequest = { doAction: string; sendInfo: Record<string, unknown> };

/** 記錄每次送出的 doAction 與 sendInfo，用來驗證 connector 的查詢編排與查詢條件。 */
function recordingClient(requests: RecordedRequest[]) {
  return new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)) as RecordedRequest);
      return new Response(JSON.stringify({ dataList: [] }));
    },
  });
}

/** 以指定設定跑完所有查詢，回傳送出的請求。 */
async function recordOrderQueries(scope: ConnectorScope, queries: Array<Partial<PlatformOrderQuery>>) {
  const requests: RecordedRequest[] = [];
  const connector = createMomoConnector({ createClient: () => recordingClient(requests), ...scope });

  for (const query of queries) {
    assert.deepEqual(await connector.fetchOrders({ ...dateRange, ...query }), []);
  }
  return requests;
}

/** 只設定一種物流商與一種溫層，第三方的查詢組合就只剩一組。 */
const singleThirdPartyScope: ConnectorScope = {
  thirdPartyDeliveryTypes: ["62"],
  thirdPartyTemperatureTypes: ["01"],
};

// 每一列的 expected 是「送出的 doAction 完整次數表」，多送或少送任何一支查詢都會失敗。
test.each([
  {
    name: "設定單一物流商與溫層時，未出貨只查 6 種超商與 1 種三方組合",
    scope: singleThirdPartyScope,
    queries: [{ status: "UNSHIPPED" }],
    expected: { unsendStoresQuery: 6, unsendThirdQuery: 1 },
  },
  {
    name: "設定單一物流商與溫層時，出貨中查 6 超商 × 5 細狀態與 2 種三方組合",
    scope: singleThirdPartyScope,
    queries: [{ status: "SHIPPING" }],
    expected: { sendingStoresQuery: 30, sendingThirdQuery: 2 },
  },
  {
    name: "未設定三方物流時查詢規格書上的完整範圍",
    scope: {},
    queries: [{ status: "UNSHIPPED" }, { status: "SHIPPING" }],
    expected: { unsendStoresQuery: 6, unsendThirdQuery: 12, sendingStoresQuery: 30, sendingThirdQuery: 8 },
  },
  {
    name: "狀態為 ALL 時未出貨與出貨中都查",
    scope: singleThirdPartyScope,
    queries: [{ status: "ALL" }],
    expected: { unsendStoresQuery: 6, unsendThirdQuery: 1, sendingStoresQuery: 30, sendingThirdQuery: 2 },
  },
])("momo connector 查詢編排：$name", async ({ scope, queries, expected }) => {
  const requests = await recordOrderQueries(scope, queries);
  assert.deepEqual(countByAction(requests), expected);
});

function countByAction(requests: RecordedRequest[]) {
  return requests.reduce<Record<string, number>>((totals, request) => {
    totals[request.doAction] = (totals[request.doAction] ?? 0) + 1;
    return totals;
  }, {});
}

// 銷售統計若混進出貨相關查詢，總覽的營收就會摻到另一種口徑的數字。
test("momo 銷售統計只查統計 API", async () => {
  const requests: RecordedRequest[] = [];
  const connector = createMomoConnector({ createClient: () => recordingClient(requests) });

  const stats = await connector.fetchSalesStatistics(dateRange);

  assert.deepEqual(countByAction(requests), { orderGoodsStatisticsQuery: 1 });
  assert.deepEqual(stats, { revenue: 0, orderCount: 0, returnCount: 0, daily: [] });
});

// 待出貨是營運當下的狀態，要走未出貨查詢，不是從統計 API 推算。
test("momo 待出貨單數只查未出貨 API", async () => {
  const requests: RecordedRequest[] = [];
  const connector = createMomoConnector({
    createClient: () => recordingClient(requests),
    ...singleThirdPartyScope,
  });

  assert.equal(await connector.fetchPendingShipmentCount(dateRange), 0);
  assert.deepEqual(countByAction(requests), { unsendStoresQuery: 6, unsendThirdQuery: 1 });
});

// 使用者在訂單頁選了條件，就不該再送出被排除掉的那些查詢。
test.each([
  {
    name: "選定超商取貨與超商別時只查該超商的未出貨訂單",
    scope: {} as ConnectorScope,
    query: { status: "UNSHIPPED", deliveryType: "Store", storeDeliveryType: "27" },
    expectedActions: ["unsendStoresQuery"],
    expectedSendInfo: [{ dely_gb: "27" }],
  },
  {
    name: "選定第三方物流時不查超商取貨訂單",
    scope: singleThirdPartyScope,
    query: { status: "UNSHIPPED", deliveryType: "ThirdParty" },
    expectedActions: ["unsendThirdQuery"],
    expectedSendInfo: [{}],
  },
  {
    name: "選定出貨中細狀態時只查該狀態",
    scope: { thirdPartyDeliveryTypes: ["62"] } as ConnectorScope,
    query: { status: "SHIPPING", deliveryType: "ThirdParty", shippingStatus: "2" },
    expectedActions: ["sendingThirdQuery"],
    expectedSendInfo: [{ status: "2", logistics: "62" }],
  },
  {
    name: "未選定細狀態時仍逐一查詢超商取貨的全部細狀態",
    scope: {} as ConnectorScope,
    query: { status: "SHIPPING", deliveryType: "Store", storeDeliveryType: "21", shippingStatus: "All" },
    expectedActions: Array.from({ length: 5 }, () => "sendingStoresQuery"),
    expectedSendInfo: ["1", "2", "3", "4", "5"].map((status) => ({ status, dely_gb: "21" })),
  },
])("momo connector 查詢條件：$name", async ({ scope, query, expectedActions, expectedSendInfo }) => {
  const requests = await recordOrderQueries(scope, [query]);

  assert.deepEqual(requests.map((request) => request.doAction), expectedActions);
  expectedSendInfo.forEach((expected, index) => {
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(requests[index].sendInfo[key], value, `第 ${index + 1} 筆的 ${key}`);
    }
  });
});

test("momo connector 依商品狀態轉成 momo 的 saleGb", async () => {
  const saleGbValues: unknown[] = [];
  const connector = createMomoConnector({
    createClient: () =>
      new MomoScmClient({
        credentials,
        fetchImpl: async (_input, init) => {
          const body = JSON.parse(String(init?.body)) as { sendInfo: { saleGB: unknown } };
          saleGbValues.push(body.sendInfo.saleGB);
          return new Response(JSON.stringify({ dataList: [] }));
        },
      }),
  });

  await connector.fetchProducts({ platformCode: "MOMO_MAIN", listingStatus: "LISTED" });
  await connector.fetchProducts({ platformCode: "MOMO_MAIN", listingStatus: "DELISTED" });
  await connector.fetchProducts({ platformCode: "MOMO_MAIN", listingStatus: "ALL" });

  assert.deepEqual(saleGbValues, ["00", "11", ""]);
});

/** 每一支查詢與它在錯誤訊息裡應該自報的名稱。 */
const queries: Array<{ label: string; run: (client: MomoScmClient) => Promise<unknown> }> = [
  { label: "超商取貨未出貨訂單查詢", run: (client) => client.queryUnshippedStoreOrders({ ...dateRange, delyGb: "21" }) },
  {
    label: "三方未出貨訂單查詢",
    run: (client) => client.queryUnshippedThirdPartyOrders({ ...dateRange, delyGb: "62", delyTemp: "01" }),
  },
  {
    label: "超商取貨出貨中訂單查詢",
    run: (client) => client.queryShippingStoreOrders({ ...dateRange, delyGb: "21", status: "1" }),
  },
  {
    label: "三方出貨中訂單查詢",
    run: (client) => client.queryShippingThirdPartyOrders({ ...dateRange, logistics: "62", status: "1" }),
  },
  { label: "商品查詢", run: (client) => client.queryGoodsBasicData() },
];

// 兩種錯誤欄位（規格上的 basicCheckMsgList 與登入失敗時的 ERROR）都要轉成中文訊息，
// 並指出是哪一支查詢失敗——否則一次查十幾批訂單時，看不出壞的是哪一批。
test.each([
  { field: "basicCheckMsgList", payload: { basicCheckMsgList: ["invalid request"] }, message: "invalid request" },
  { field: "ERROR", payload: { ERROR: "登入失敗" }, message: "登入失敗" },
])("momo SCM 把 $field 轉成指出查詢名稱的中文錯誤訊息", async ({ payload, message }) => {
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async () => new Response(JSON.stringify(payload)),
  });

  for (const { label, run } of queries) {
    await assert.rejects(run(client), new RegExp(`momo SCM ${label}失敗：${message}`));
  }
});

test("momo SCM routes both unshipped order APIs through the configured proxy", async () => {
  const requests: Array<{ url: string; token: string | null; target: string | null }> = [];
  const client = new MomoScmClient({
    credentials,
    proxyUrl: "https://proxy.example.run.app/",
    proxyToken: "proxy-secret",
    fetchImpl: async (input, init) => {
      const headers = new Headers(init?.headers);
      requests.push({ url: String(input), token: headers.get("x-proxy-token"), target: headers.get("x-target-url") });
      return new Response(JSON.stringify({ dataList: [] }));
    },
  });

  await client.queryGoodsBasicData();
  await client.queryUnshippedStoreOrders({ ...dateRange, delyGb: "27" });
  await client.queryUnshippedThirdPartyOrders({ ...dateRange, delyGb: "63", delyTemp: "03" });

  assert.deepEqual(requests.map((request) => request.url), [
    "https://proxy.example.run.app/GoodsServlet.do",
    "https://proxy.example.run.app/OrderServlet.do",
    "https://proxy.example.run.app/OrderServlet.do",
  ]);
  for (const request of requests) {
    assert.equal(request.token, "proxy-secret");
    assert.equal(request.target, "https://scmapi.momoshop.com.tw");
  }
});

// 「設了 proxyUrl 卻沒給 token 就擋下」是共用的 resolvePlatformRequest 行為，
// 已由 platform-transport.test.ts 直接驗證，各 client 不再各測一次。

test("momo SCM 商品查詢打 GoodsServlet.do，並把同一商品的多個單品併成一筆", async () => {
  const dataList = [
    {
      GOODS_CODE: "1000000",
      GOODS_NAME: "誠得保溫瓶 750ml",
      GOODSDT_CODE: "001",
      GOODSDT_INFO: "曜石黑",
      ENTP_GOODS_NO: "CD-1001",
      SALEGB_NAME: "進行",
      SALE_PRICE: "1280",
    },
    {
      GOODS_CODE: "1000000",
      GOODS_NAME: "誠得保溫瓶 750ml",
      GOODSDT_CODE: "002",
      GOODSDT_INFO: "珍珠白",
      ENTP_GOODS_NO: "CD-1001",
      SALEGB_NAME: "進行",
      SALE_PRICE: "1180",
    },
    {
      GOODS_CODE: "1000001",
      GOODS_NAME: "護眼檯燈",
      GOODSDT_CODE: "001",
      GOODSDT_INFO: "無",
      ENTP_GOODS_NO: "",
      SALEGB_NAME: "暫時中斷",
      SALE_PRICE: "2480",
    },
  ];
  let requestUrl: string | undefined;
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ dataList }));
    },
  });

  const rows = await client.queryGoodsBasicData();

  assert.equal(requestUrl, "https://scmapi.momoshop.com.tw/GoodsServlet.do");
  assert.equal(requestBody?.doAction, "queryGoodsBasicData");
  assert.deepEqual(requestBody?.sendInfo, { goodsCode: "", goodsName: "", entpGoodsNo: "", saleGB: "" });
  assert.deepEqual(requestBody?.loginInfo, {
    entpID: credentials.entpId,
    entpCode: credentials.entpCode,
    entpPwd: credentials.entpPassword,
    otpBackNo: credentials.otpBackNo,
  });
  assert.equal(rows.length, 3);

  // 兩列單品屬於同一個 GOODS_CODE，攤平後應只剩一筆商品、售價取最低價。
  assert.deepEqual(mapMomoGoodsBasicData(rows), [
    {
      id: "MOMO_MAIN:1000000",
      platformCode: "MOMO_MAIN",
      goodsCode: "1000000",
      name: "誠得保溫瓶 750ml",
      entpGoodsNo: "CD-1001",
      salePrice: 1180,
      listingStatus: "LISTED",
      skuCount: 2,
    },
    {
      id: "MOMO_MAIN:1000001",
      platformCode: "MOMO_MAIN",
      goodsCode: "1000001",
      name: "護眼檯燈",
      entpGoodsNo: null,
      salePrice: 2480,
      listingStatus: "DELISTED",
      skuCount: 1,
    },
  ]);
});

test("momo SCM 訂單商品接單統計查詢發送正確的 orderGoodsStatisticsQuery payload", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          dataList: [
            {
              goodsCode: "1000001",
              entpGoodsNo: "CD-1001",
              goodsName: "保溫瓶",
              goodsDtInfo: "黑色",
              buyPrice: 1000,
              orderQty: 5,
              claimQty: 0,
            },
          ],
        }),
      );
    },
  });

  const rows = await client.queryOrderGoodsStatistics({
    from: new Date("2026-08-01T00:00:00+08:00"),
    to: new Date("2026-08-14T23:59:59+08:00"),
  });

  assert.equal(requestBody?.doAction, "orderGoodsStatisticsQuery");
  assert.deepEqual(requestBody?.sendInfo, {
    stDate: "2026/08/01",
    edDate: "2026/08/14",
    entpGoodsCode: "",
    goodsCode: "",
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.buyPrice, 1000);
});

const packaging = { shipTypeStr: "紙箱", packTypeStr: "標準", packUnit: "1" };

test("momo SCM 超商取貨併箱送出 boxYn 與固定的 remark5VStr", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({ resultInfo: { combineOkCnt: "2", combineFailCnt: "0" } }),
      );
    },
  });

  const result = await client.combineStoreBoxes(new Map([["A1", "1"], ["A2", "1"]]));

  assert.equal(requestBody?.doAction, "unsendStoresCombineBox");
  assert.deepEqual(requestBody?.sendInfoList, [
    { completeOrderNo: "A1", boxYn: "1", remark5VStr: "可出貨" },
    { completeOrderNo: "A2", boxYn: "1", remark5VStr: "可出貨" },
  ]);
  assert.equal(result.combineOkCnt, "2");
});

test("momo SCM 第三方物流併箱打 unsendThirdCombineBox", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ resultInfo: {} }));
    },
  });

  await client.combineThirdPartyBoxes(new Map([["A1", "00"]]));

  assert.equal(requestBody?.doAction, "unsendThirdCombineBox");
});

test("momo SCM 超商取貨出貨確認送出包材三欄，resultInfo 為陣列", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ resultInfo: [{ completeOrderNo: "A1", confirmOkCnt: "1" }] }));
    },
  });

  const result = await client.finishStoreShipment(["A1"], packaging);

  assert.equal(requestBody?.doAction, "unsendStoresFinish");
  assert.deepEqual(requestBody?.sendInfoList, [
    { completeOrderNo: "A1", remark5VStr: "可出貨", shipTypeStr: "紙箱", packTypeStr: "標準", packUnit: "1" },
  ]);
  assert.ok(Array.isArray(result));
  assert.equal(result[0]?.confirmOkCnt, "1");
});

test("momo SCM 第三方物流出貨確認打 unsendThirdFinish，欄位與超商取貨相同", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ resultInfo: { confirmOkList: ["A1"] } }));
    },
  });

  const result = await client.finishThirdPartyShipment(["A1"], packaging);

  assert.equal(requestBody?.doAction, "unsendThirdFinish");
  assert.deepEqual((requestBody?.sendInfoList as Array<Record<string, unknown>>)[0], {
    completeOrderNo: "A1",
    remark5VStr: "可出貨",
    shipTypeStr: "紙箱",
    packTypeStr: "標準",
    packUnit: "1",
  });
  assert.deepEqual(result, [{ confirmOkList: ["A1"] }]);
});

test("momo SCM 超商取貨列印：printType 在 body 最外層，不在 sendInfoList 裡", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ pdfData: "JVBERi0xLjQ=" }));
    },
  });

  const result = await client.printStoreLabels(["A1", "A2"], "dt");

  assert.equal(requestBody?.doAction, "unsendStoresPrintPdf");
  assert.equal(requestBody?.printType, "dt");
  assert.deepEqual(requestBody?.sendInfoList, [{ completeOrderNo: "A1" }, { completeOrderNo: "A2" }]);
  assert.equal(result.pdfData, "JVBERi0xLjQ=");

  // 未指定時預設 label。
  await client.printStoreLabels(["A1"]);
  assert.equal(requestBody?.printType, "label");
});

test("momo SCM 第三方物流列印用 sendInfoList 並帶 third_delyGb", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ pdfData: "JVBERi0xLjQ=" }));
    },
  });

  await client.printThirdPartyLabels("62", ["A1", "A2"], "all");

  assert.equal(requestBody?.doAction, "unsendThirdPrintPdf");
  assert.equal(requestBody?.printType, "all");
  assert.equal(requestBody?.third_delyGb, "62");
  assert.deepEqual(requestBody?.sendInfoList, [{ completeOrderNo: "A1" }, { completeOrderNo: "A2" }]);
});

test("momo SCM 併箱／出貨確認／列印遇到 ERROR 或 basicCheckMsgList 都拋出附動作名稱的錯誤", async () => {
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async () => new Response(JSON.stringify({ ERROR: "登入失敗" })),
  });

  await assert.rejects(client.combineStoreBoxes(new Map()), /momo SCM 超商取貨併箱失敗：登入失敗/);
  await assert.rejects(client.finishThirdPartyShipment([], packaging), /momo SCM 第三方物流出貨確認失敗：登入失敗/);
  await assert.rejects(client.printStoreLabels([]), /momo SCM 超商取貨列印失敗：登入失敗/);
  await assert.rejects(client.queryShipTypes(), /momo SCM 配送類型清單查詢失敗：登入失敗/);
});

test("momo SCM 配送類型清單查詢打 /order/shipType/getShipTypeList.scm，沒有 doAction", async () => {
  let requestUrl: string | undefined;
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          dataList: [{ name: "紙箱", neewWeight: true, subLevelList: [{ name: "標準" }, { name: "加大" }] }],
        }),
      );
    },
  });

  const options = await client.queryShipTypes();

  assert.equal(requestUrl, "https://scmapi.momoshop.com.tw/order/shipType/getShipTypeList.scm");
  assert.equal(requestBody?.doAction, undefined);
  assert.deepEqual(requestBody?.loginInfo, {
    entpID: credentials.entpId,
    entpCode: credentials.entpCode,
    entpPwd: credentials.entpPassword,
    otpBackNo: credentials.otpBackNo,
  });
  assert.deepEqual(options, [{ name: "紙箱", needsWeight: true, packTypes: ["標準", "加大"] }]);
});

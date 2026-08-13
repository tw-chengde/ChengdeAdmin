import assert from "node:assert/strict";
import { test } from "vitest";
import { createMomoConnector } from "@/app/lib/platforms/momo";
import { mapMomoShippingOrders, mapMomoUnshippedOrders } from "@/app/lib/platforms/momo-order-mapper";
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
  assert.deepEqual(mapMomoUnshippedOrders(rows).map((order) => ({
    orderNo: order.orderNo,
    customerName: order.customerName,
    logistics: order.logistics,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
  })), [{ orderNo: "STORE-001", customerName: "Jane", logistics: "Store A", totalAmount: 300, createdAt: "2026-08-01" }]);
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
  assert.deepEqual(mapMomoUnshippedOrders(rows).map((order) => ({
    orderNo: order.orderNo,
    customerName: order.customerName,
    address: order.address,
    logistics: order.logistics,
    note: order.note,
  })), [{ orderNo: "THIRD-001", customerName: "Jo*n", address: "Taipei City", logistics: "Carrier A", note: "Delivery note" }]);
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
        }],
      }));
    },
  });

  const rows = await client.queryShippingStoreOrders({ ...dateRange, delyGb: "21", status: "2" });
  assert.deepEqual(mapMomoShippingOrders(rows)[0]?.pickupStore, {
    brand: "7-11",
    name: "Store A",
    id: "123456",
  });

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
  assert.deepEqual(mapMomoShippingOrders(rows).map((order) => ({
    status: order.status,
    customerName: order.customerName,
    logistics: order.logistics,
    trackingNo: order.trackingNo,
  })), [{ status: "配送中", customerName: "Ja*e", logistics: "Store A", trackingNo: "SLIP-001" }]);
});

test("momo SCM queries shipping third-party orders with the documented payload", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ dataList: [] }));
    },
  });

  await client.queryShippingThirdPartyOrders({ ...dateRange, logistics: "63", status: "1" });

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

test("momo connector limits third-party unshipped queries to configured HCT ambient", async () => {
  const actions: string[] = [];
  const connector = createMomoConnector({
    createClient: () => recordingClient(actions),
    thirdPartyDeliveryTypes: ["62"],
    thirdPartyTemperatureTypes: ["01"],
  });

  const orders = await connector.fetchOrders({ ...dateRange, status: "UNSHIPPED" });

  assert.deepEqual(orders, []);
  assert.equal(actions.filter((action) => action === "unsendStoresQuery").length, 6);
  assert.equal(actions.filter((action) => action === "unsendThirdQuery").length, 1);
  assert.ok(!actions.includes("unsendCompanyQuery"));
});

/** 記錄每次送出的 doAction，用來驗證 connector 的查詢編排。 */
function recordingClient(actions: string[]) {
  return new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      actions.push((JSON.parse(String(init?.body)) as { doAction: string }).doAction);
      return new Response(JSON.stringify({ dataList: [] }));
    },
  });
}

test("momo connector limits third-party shipping queries to configured HCT", async () => {
  const actions: string[] = [];
  const connector = createMomoConnector({
    createClient: () => recordingClient(actions),
    thirdPartyDeliveryTypes: ["62"],
    thirdPartyTemperatureTypes: ["01"],
  });

  const orders = await connector.fetchOrders({ ...dateRange, status: "SHIPPING" });

  assert.deepEqual(orders, []);
  assert.equal(actions.filter((action) => action === "sendingStoresQuery").length, 30);
  assert.equal(actions.filter((action) => action === "sendingThirdQuery").length, 2);
  assert.ok(!actions.includes("unsendStoresQuery"));
  assert.ok(!actions.includes("unsendThirdQuery"));
});

test("momo connector queries the full documented third-party scope when not configured", async () => {
  const actions: string[] = [];
  const connector = createMomoConnector({ createClient: () => recordingClient(actions) });

  await connector.fetchOrders({ ...dateRange, status: "UNSHIPPED" });
  await connector.fetchOrders({ ...dateRange, status: "SHIPPING" });

  assert.equal(actions.filter((action) => action === "unsendThirdQuery").length, 12);
  assert.equal(actions.filter((action) => action === "sendingThirdQuery").length, 8);
});

test("momo connector 未指定狀態時同時查未出貨與出貨中", async () => {
  const actions: string[] = [];
  const connector = createMomoConnector({
    createClient: () => recordingClient(actions),
    thirdPartyDeliveryTypes: ["62"],
    thirdPartyTemperatureTypes: ["01"],
  });

  await connector.fetchOrders({ ...dateRange, status: "ALL" });

  assert.ok(actions.includes("unsendStoresQuery"));
  assert.ok(actions.includes("unsendThirdQuery"));
  assert.ok(actions.includes("sendingStoresQuery"));
  assert.ok(actions.includes("sendingThirdQuery"));
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
test("momo SCM reports documented API validation errors", async () => {
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async () => new Response(JSON.stringify({ basicCheckMsgList: ["invalid request"] })),
  });

  await assert.rejects(
    client.queryUnshippedStoreOrders({ ...dateRange, delyGb: "21" }),
    /momo SCM 超商取貨未出貨訂單查詢失敗：invalid request/,
  );
});

test("momo SCM 各查詢的錯誤訊息都指出是哪一個查詢失敗", async () => {
  const rejecting = new MomoScmClient({
    credentials,
    fetchImpl: async () => new Response(JSON.stringify({ ERROR: "登入失敗" })),
  });

  await assert.rejects(
    rejecting.queryUnshippedThirdPartyOrders({ ...dateRange, delyGb: "62", delyTemp: "01" }),
    /momo SCM 三方未出貨訂單查詢失敗：登入失敗/,
  );
  await assert.rejects(
    rejecting.queryShippingStoreOrders({ ...dateRange, delyGb: "21", status: "1" }),
    /momo SCM 超商取貨出貨中訂單查詢失敗：登入失敗/,
  );
  await assert.rejects(
    rejecting.queryShippingThirdPartyOrders({ ...dateRange, logistics: "62", status: "1" }),
    /momo SCM 三方出貨中訂單查詢失敗：登入失敗/,
  );
  await assert.rejects(rejecting.queryGoodsBasicData(), /momo SCM 商品查詢失敗：登入失敗/);
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

test("momo SCM requires a proxy token when a proxy URL is configured", async () => {
  const client = new MomoScmClient({
    credentials,
    proxyUrl: "https://proxy.example.run.app",
    fetchImpl: async () => new Response("{}"),
  });

  await assert.rejects(client.queryUnshippedStoreOrders({ ...dateRange, delyGb: "21" }), /MOMO_PROXY_TOKEN/);
});


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

test("momo SCM 商品查詢把商品狀態帶進 saleGB", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ dataList: [] }));
    },
  });

  await client.queryGoodsBasicData({ saleGb: "00" });

  assert.deepEqual(requestBody?.sendInfo, { goodsCode: "", goodsName: "", entpGoodsNo: "", saleGB: "00" });
});

test("momo SCM 商品查詢把 basicCheckMsgList 轉成中文錯誤訊息", async () => {
  const client = new MomoScmClient({
    credentials,
    fetchImpl: async () => new Response(JSON.stringify({ basicCheckMsgList: ["查無資料"] })),
  });
  await assert.rejects(client.queryGoodsBasicData(), /momo SCM 商品查詢失敗：查無資料/);
});

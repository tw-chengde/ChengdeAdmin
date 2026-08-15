import assert from "node:assert/strict";
import { test } from "vitest";
import { createMoStorePlusConnector } from "@/app/lib/platforms/mo-store-plus";
import { MoStorePlusClient } from "@/app/lib/platforms/mo-store-plus-client";
import { mapMoStorePlusOrders } from "@/app/lib/platforms/mo-store-plus-order-mapper";
import { mapMoStorePlusGoods } from "@/app/lib/platforms/mo-store-plus-product-mapper";

test("mo店+ sends the documented OrderQuery POST payload and extracts listOrder", async () => {
  let authorization: string | null = null;
  let requestUrl: string | undefined;
  let method: string | undefined;
  let contentType: string | null = null;
  let body: Record<string, unknown> | undefined;
  const client = new MoStorePlusClient({
    authValue: "Bearer token",
    fetchImpl: async (_input, init) => {
      requestUrl = String(_input);
      method = init?.method;
      const headers = new Headers(init?.headers);
      authorization = headers.get("Authorization");
      contentType = headers.get("Content-Type");
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          listOrder: [
            {
              orderNo: "MO-1",
              listItem: [
                {
                  goodsName: "商品",
                  quantity: 1,
                  orderAmount: 99,
                  customerName: "王小明",
                  receiverAddress: "台北市信義區忠孝東路五段",
                },
              ],
            },
          ],
        }),
      );
    },
  });

  const orders = await client.fetchOrders({ from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-08-02T00:00:00Z") });

  assert.equal(authorization, "Bearer token");
  assert.equal(requestUrl, "https://api3p.momo.com.tw/VendorApi/OrderQuery");
  assert.equal(method, "POST");
  assert.equal(contentType, "application/json");
  assert.deepEqual(body, {
    pageIndex: 1,
    maxPerPage: 1000,
    listOrderNo: [],
    queryDateType: "OrderDate",
    fromDate: "2026/08/01",
    toDate: "2026/08/02",
    deliveryType: "All",
    storeDeliveryType: "All",
    orderStatus: "All",
    goodsNo: "",
    goodsName: "",
    entpGoodsNo: "",
    customerName: "",
    orderChangeAddrStatus: "All",
  });
  assert.equal(mapMoStorePlusOrders(orders)[0].orderNo, "MO-1");
  assert.equal(mapMoStorePlusOrders(orders)[0].customerName, "王小明");
  assert.equal(mapMoStorePlusOrders(orders)[0].address, "台北市信義區忠孝東路五段");
  assert.equal(mapMoStorePlusOrders(orders)[0].totalAmount, 99);
});

test("mo店+ 將選取的訂單狀態與配送類型傳入 OrderQuery", async () => {
  let body: Record<string, unknown> | undefined;
  const client = new MoStorePlusClient({
    fetchImpl: async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ listOrder: [] }));
    },
  });

  await client.fetchOrders({
    orderStatus: "Shipping",
    deliveryType: "Store",
    storeDeliveryType: "StoreToStoreShip",
  });

  assert.equal(body?.orderStatus, "Shipping");
  assert.equal(body?.deliveryType, "Store");
  // 規格書的超取分類是取件流向（StoreToStoreShip…），不是 7-ELEVEN／全家等超商代碼。
  assert.equal(body?.storeDeliveryType, "StoreToStoreShip");
});

test("mo店+ 訂單查詢逐頁抓到 totalOrders 為止", async () => {
  const pages = [
    { pageIndex: 1, maxPerPage: 2, totalOrders: 3, listOrder: [{ orderNo: "MO-1" }, { orderNo: "MO-2" }] },
    { pageIndex: 2, maxPerPage: 2, totalOrders: 3, listOrder: [{ orderNo: "MO-3" }] },
  ];
  const requests: Array<Record<string, unknown>> = [];
  const client = new MoStorePlusClient({
    fetchImpl: async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify(pages[requests.length - 1]));
    },
  });

  const orders = await client.fetchOrders({ maxPerPage: 2 });

  assert.deepEqual(
    requests.map((request) => request.pageIndex),
    [1, 2],
  );
  assert.deepEqual(
    orders.map((order) => order.orderNo),
    ["MO-1", "MO-2", "MO-3"],
  );
});

// 平台謊報總數，且每頁都還回傳資料時，正常的迴圈條件永遠不會結束。
test.each([
  {
    what: "訂單",
    page: (calls: number) => ({ totalOrders: 999999, listOrder: [{ orderNo: `MO-${calls}` }] }),
    fetch: (client: MoStorePlusClient) => client.fetchOrders({ maxPerPage: 1, maxPages: 3 }),
  },
  {
    what: "商品",
    page: (calls: number) => ({ totalGoods: 999999, result: [{ goodsCode: `G${calls}` }] }),
    fetch: (client: MoStorePlusClient) => client.fetchGoods({ maxPerPage: 1, maxPages: 3 }),
  },
])("mo店+ $what 查詢遇到異常的總數時受 maxPages 上限保護", async ({ page, fetch }) => {
  let calls = 0;
  const client = new MoStorePlusClient({
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify(page(calls)));
    },
  });

  assert.equal((await fetch(client)).length, 3);
  assert.equal(calls, 3);
});

test.each([
  { what: "訂單", fetch: (client: MoStorePlusClient) => client.fetchOrders() },
  { what: "商品", fetch: (client: MoStorePlusClient) => client.fetchGoods() },
])("mo店+ $what 查詢把 errorMessage 轉成中文錯誤訊息", async ({ what, fetch }) => {
  const client = new MoStorePlusClient({
    fetchImpl: async () => new Response(JSON.stringify({ errorMessage: "token 已過期" })),
  });
  await assert.rejects(fetch(client), new RegExp(`mo店\\+ ${what}查詢失敗：token 已過期`));
});

test("mo店+ connector 在 STATISTICS 查詢時帶入 OrderDate 與 All", async () => {
  let body: Record<string, unknown> | undefined;
  const connector = createMoStorePlusConnector({
    createClient: () =>
      new MoStorePlusClient({
        fetchImpl: async (_input, init) => {
          body = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(JSON.stringify({ listOrder: [] }));
        },
      }),
  });

  await connector.fetchOrders({
    from: new Date("2026-08-01"),
    to: new Date("2026-08-14"),
    status: "STATISTICS",
  });

  assert.equal(body?.queryDateType, "OrderDate");
  assert.equal(body?.orderStatus, "All");
});

test("mo店+ 商品查詢逐頁抓到 totalGoods 為止，並彙總單品的庫存與售價", async () => {
  const pages = [
    {
      pageIndex: 1,
      maxPerPage: 2,
      totalGoods: 3,
      result: [
        {
          goodsCode: "11111",
          goodsName: "誠得保溫瓶 750ml",
          saleStatus: "StartSelling",
          salePrice: 1280,
          listGoodsdt: [
            { goodsdtCode: "001", quantity: 5, entpGoodsNo: "CD-1001", salePrice: 1280, dtSaleStatus: "on" },
            { goodsdtCode: "002", quantity: 1, entpGoodsNo: "CD-1001", salePrice: 1180, dtSaleStatus: "off" },
          ],
        },
        { goodsCode: "22222", goodsName: "護眼檯燈", saleStatus: "StopSelling", salePrice: 2480, listGoodsdt: [] },
      ],
    },
    {
      pageIndex: 2,
      maxPerPage: 2,
      totalGoods: 3,
      result: [{ goodsCode: "33333", goodsName: "辦公椅", saleStatus: "StartSelling", salePrice: null, listGoodsdt: [] }],
    },
  ];

  const requests: Array<{ url: string; method?: string; body: Record<string, unknown> }> = [];
  const client = new MoStorePlusClient({
    authValue: "Bearer token",
    fetchImpl: async (input, init) => {
      requests.push({ url: String(input), method: init?.method, body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify(pages[requests.length - 1] ?? { totalGoods: 0, result: [] }));
    },
  });

  const goods = await client.fetchGoods({ maxPerPage: 2 });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, "https://api3p.momo.com.tw/VendorApi/GoodsQueryByMethod");
  assert.equal(requests[0].method, "POST");
  assert.deepEqual(
    requests.map((request) => request.body.pageIndex),
    [1, 2],
  );
  assert.equal(requests[0].body.queryMethod, "All");
  assert.equal(requests[0].body.saleStatus, "All");
  assert.equal(requests[0].body.pageIndex, 1);
  assert.equal(requests[0].body.maxPerPage, 2);
  // 規格書指定 applyDate 為 `yyyy-MM-dd HH:mm:ss`，與訂單查詢的 `yyyy/MM/dd` 不同。
  assert.match(String(requests[0].body.applyDate), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.equal(goods.length, 3);

  assert.deepEqual(mapMoStorePlusGoods(goods), [
    {
      id: "MO_STORE_PLUS:11111",
      platformCode: "MO_STORE_PLUS",
      goodsCode: "11111",
      name: "誠得保溫瓶 750ml",
      entpGoodsNo: "CD-1001",
      salePrice: 1180,
      listingStatus: "LISTED",
      skuCount: 2,
    },
    {
      id: "MO_STORE_PLUS:22222",
      platformCode: "MO_STORE_PLUS",
      goodsCode: "22222",
      name: "護眼檯燈",
      entpGoodsNo: null,
      salePrice: 2480,
      listingStatus: "DELISTED",
      skuCount: 0,
    },
    {
      id: "MO_STORE_PLUS:33333",
      platformCode: "MO_STORE_PLUS",
      goodsCode: "33333",
      name: "辦公椅",
      entpGoodsNo: null,
      salePrice: null,
      listingStatus: "LISTED",
      skuCount: 0,
    },
  ]);

  // 指定商品狀態時要照樣帶進 saleStatus。
  await client.fetchGoods({ saleStatus: "StopSelling" });
  assert.equal(requests.at(-1)?.body.saleStatus, "StopSelling");
});

test("mo店+ 設定 proxy 後，訂單與商品查詢都改送 proxy 並帶上目標主機標頭", async () => {
  const requests: Array<{ url: string; token: string | null; target: string | null; auth: string | null }> = [];
  const client = new MoStorePlusClient({
    authValue: "Bearer token",
    proxyUrl: "https://proxy.example.run.app/",
    proxyToken: "proxy-secret",
    fetchImpl: async (input, init) => {
      const headers = new Headers(init?.headers);
      requests.push({
        url: String(input),
        token: headers.get("x-proxy-token"),
        target: headers.get("x-target-url"),
        auth: headers.get("Authorization"),
      });
      return new Response(JSON.stringify({ totalOrders: 0, listOrder: [], totalGoods: 0, result: [] }));
    },
  });

  await client.fetchOrders();
  await client.fetchGoods();

  assert.deepEqual(
    requests.map((request) => request.url),
    [
      // proxy 保留原始路徑，僅換掉主機；結尾斜線不應造成重複斜線。
      "https://proxy.example.run.app/VendorApi/OrderQuery",
      "https://proxy.example.run.app/VendorApi/GoodsQueryByMethod",
    ],
  );
  for (const request of requests) {
    assert.equal(request.token, "proxy-secret");
    assert.equal(request.target, "https://api3p.momo.com.tw");
    // proxy 標頭不應蓋掉平台自己的授權標頭。
    assert.equal(request.auth, "Bearer token");
  }
});

// 「設了 proxyUrl 卻沒給 token 就擋下」是共用的 resolvePlatformRequest 行為，
// 已由 platform-transport.test.ts 直接驗證，各 client 不再各測一次。

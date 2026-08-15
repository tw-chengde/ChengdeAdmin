import assert from "node:assert/strict";
import { test } from "vitest";
import {
  mapMoStorePlusOrders,
  toMoStorePlusOrderStatus,
} from "@/app/lib/platforms/mo-store-plus-order-mapper";
import {
  mapMomoSalesStatistics,
  mapMomoShippingOrders,
  mapMomoUnshippedOrders,
} from "@/app/lib/platforms/momo-order-mapper";
import { orderStats, statusStyle } from "@/app/utils/orders";

/**
 * 迴歸測試：mapper 過去用 `as` 把 "待出貨" 硬塞進 OrderItem["status"]，
 * 但那個值不在型別的聯集裡，也沒有任何地方處理它。後果是 momo 訂單永遠是灰色、
 * 永遠不計入「待處理出貨」、也永遠不會出現「發貨」按鈕。
 */
test("momo 未出貨訂單對應到待發貨，並計入待處理出貨", () => {
  const orders = mapMomoUnshippedOrders([
    {
      completeOrderNo: "MOMO-1",
      goodsName: "保溫瓶",
      goodsDtInfo: "藍",
      syslast: "1",
      salePrice: "100",
      lastPricDate: "2026/08/01 10:00",
    },
  ]);

  assert.equal(orders[0].status, "待發貨");
  assert.equal(orderStats(orders, "MOMO_MAIN").pendingShipment, 1);
  // 有對應到具體狀態才會拿到非中性的樣式。
  assert.equal(statusStyle(orders[0].status).color, "#b54708");
});

test("momo 出貨中訂單對應到配送中，不計入待處理出貨", () => {
  const orders = mapMomoShippingOrders([
    { completeOrderNo: "MOMO-2", goods_name: "檯燈", syslast: "1", create_date: "2026/08/02 09:00" },
  ]);

  assert.equal(orders[0].status, "配送中");
  assert.equal(orderStats(orders, "MOMO_MAIN").pendingShipment, 0);
});

/**
 * 迴歸測試：mapper 過去把出貨中訂單一律標成「配送中」，
 * 於是第三方物流不管查「已印單」還是「配送中」，畫面上都寫配送中。
 * 細狀態要讀回應的 code_name，不是從查詢條件回推。
 */
test("momo 出貨中訂單以 code_name 作為細狀態", () => {
  const [printed] = mapMomoShippingOrders([{ completeOrderNo: "MOMO-3", code_name: "已印單" }]);
  const [shipping] = mapMomoShippingOrders([{ completeOrderNo: "MOMO-4", code_name: "配送中" }]);

  assert.equal(printed.statusDetail, "已印單");
  assert.equal(shipping.statusDetail, "配送中");
  // 細狀態不影響正規化狀態，統計與樣式維持既有行為。
  assert.equal(printed.status, "配送中");
  assert.equal(orderStats([printed], "MOMO_MAIN").pendingShipment, 0);
});

test("momo 出貨中訂單沒有 code_name 時不編造文字", () => {
  const [empty] = mapMomoShippingOrders([{ completeOrderNo: "MOMO-5", code_name: "" }]);
  const [missing] = mapMomoShippingOrders([{ completeOrderNo: "MOMO-6" }]);

  assert.equal(empty.statusDetail, undefined);
  assert.equal(missing.statusDetail, undefined);
});

test("momo 未出貨（超商取貨）訂單的收件人、超商與金額取自對應欄位", () => {
  const [order] = mapMomoUnshippedOrders([
    {
      completeOrderNo: "STORE-001",
      goodsName: "Store item",
      goodsDtInfo: "Blue",
      syslast: "2",
      salePrice: "150",
      Receiver: "Jane",
      storeIdName: "Store A",
      lastPricDate: "2026/08/01 10:00",
    },
  ]);

  assert.equal(order.customerName, "Jane");
  assert.equal(order.logistics, "Store A");
  // 金額是「單價 × 件數」加總，不是直接拿 salePrice。
  assert.equal(order.totalAmount, 300);
  assert.equal(order.createdAt, "2026-08-01");
});

test("momo 未出貨（三方物流）訂單改用遮罩欄位與物流商名稱", () => {
  const [order] = mapMomoUnshippedOrders([
    {
      completeOrderNo: "THIRD-001",
      goodsName: "Third-party item",
      syslast: "1",
      salePrice: "880",
      receiverMask: "Jo*n",
      receiverAddrMask: "Taipei City",
      orderDelyGbName: "Carrier A",
      scm_msg: "Delivery note",
    },
  ]);

  assert.equal(order.customerName, "Jo*n");
  assert.equal(order.address, "Taipei City");
  assert.equal(order.logistics, "Carrier A");
  assert.equal(order.note, "Delivery note");
});

/** 回應本身不含超商別，靠 client 補上查詢時的 delyGb，mapper 才對應得到超商品牌。 */
test("momo 出貨中（超商取貨）訂單以查詢時的超商別對應到超商品牌", () => {
  const [order] = mapMomoShippingOrders([
    {
      completeOrderNo: "SHIPPING-STORE-001",
      goods_name: "Shipping store item",
      syslast: "1",
      receiver_mask: "Ja*e",
      storeName: "Store A",
      storeId: "123456",
      storeDeliveryType: "21",
      slip_no: "SLIP-001",
      create_date: "2026/08/01 10:00",
      code_name: "已印單未到貨",
    },
  ]);

  assert.deepEqual(order.pickupStore, { brand: "7-11", name: "Store A", id: "123456" });
  assert.equal(order.customerName, "Ja*e");
  assert.equal(order.logistics, "Store A");
  assert.equal(order.trackingNo, "SLIP-001");
  assert.equal(order.statusDetail, "已印單未到貨");
});

test("mo店+ 實際回傳的品項狀態對應到統一的訂單狀態", () => {
  assert.equal(toMoStorePlusOrderStatus("訂單接獲(未付款)"), "待付款");
  assert.equal(toMoStorePlusOrderStatus("出貨通知(已付款)"), "待發貨");
  assert.equal(toMoStorePlusOrderStatus("出貨確認"), "配送中");
  assert.equal(toMoStorePlusOrderStatus("配送結束"), "已完成");
  assert.equal(toMoStorePlusOrderStatus("回收確認"), "退貨申請");
  assert.equal(toMoStorePlusOrderStatus("客戶取消"), "已取消");
});

test("mo店+ 保留英文查詢條件值的相容 mapping", () => {
  assert.equal(toMoStorePlusOrderStatus("Unpaid"), "待付款");
  assert.equal(toMoStorePlusOrderStatus("NotShipped"), "待發貨");
  assert.equal(toMoStorePlusOrderStatus("Printed"), "待發貨");
  assert.equal(toMoStorePlusOrderStatus("Shipping"), "配送中");
  assert.equal(toMoStorePlusOrderStatus("AbnormalDelivery"), "配送中");
  assert.equal(toMoStorePlusOrderStatus("DoneDelivery"), "已完成");
  assert.equal(toMoStorePlusOrderStatus("OrderCancelled"), "已取消");
  assert.equal(toMoStorePlusOrderStatus("ReturnCancelled"), "已取消");
  assert.equal(toMoStorePlusOrderStatus("NotRecycled"), "退貨申請");
  assert.equal(toMoStorePlusOrderStatus("RecycleConfirmed"), "退貨申請");
});

// 猜錯狀態會直接讓「待處理出貨」的數字說謊，比顯示成未知狀態更難察覺。
test("mo店+ 認不出的狀態落到其他，不猜測也不計入統計", () => {
  assert.equal(toMoStorePlusOrderStatus("SomeNewStatus"), "其他");
  assert.equal(toMoStorePlusOrderStatus(""), "其他");
  assert.equal(toMoStorePlusOrderStatus(undefined), "其他");
  assert.equal(toMoStorePlusOrderStatus(123), "其他");

  const orders = mapMoStorePlusOrders([
    { orderNo: "MO-1", listItem: [{ itemStatus: "SomeNewStatus", goodsName: "保溫瓶" }] },
  ]);
  assert.equal(orders[0].status, "其他");
  const stats = orderStats(orders, "MO_STORE_PLUS");
  assert.equal(stats.pendingShipment, 0);
  assert.equal(stats.rmaCount, 0);
});

test("mo店+ 訂單狀態取自品項層的 itemStatus", () => {
  const orders = mapMoStorePlusOrders([
    { orderNo: "MO-2", listItem: [{ itemStatus: "NotShipped", goodsName: "保溫瓶" }] },
  ]);

  assert.equal(orders[0].status, "待發貨");
});

/**
 * 迴歸測試：OrderQuery 沒有訂單層狀態，過去只讀 listItem[0]，
 * 於是「出貨一半」的訂單整張看起來都出完了，待處理出貨的數字會少算。
 */
test("mo店+ 多品項訂單取進度最落後的品項狀態", () => {
  const [partiallyShipped] = mapMoStorePlusOrders([
    {
      orderNo: "MO-2C",
      listItem: [{ itemStatus: "出貨確認" }, { itemStatus: "出貨通知(已付款)" }],
    },
  ]);
  assert.equal(partiallyShipped.status, "待發貨");
  assert.equal(orderStats([partiallyShipped], "MO_STORE_PLUS").pendingShipment, 1);

  // 部分取消不該讓整張訂單被標成已取消。
  const [partiallyCancelled] = mapMoStorePlusOrders([
    { orderNo: "MO-2D", listItem: [{ itemStatus: "客戶取消" }, { itemStatus: "出貨通知(已付款)" }] },
  ]);
  assert.equal(partiallyCancelled.status, "待發貨");

  // 全數取消才是已取消。
  const [fullyCancelled] = mapMoStorePlusOrders([
    { orderNo: "MO-2E", listItem: [{ itemStatus: "客戶取消" }, { itemStatus: "客戶取消" }] },
  ]);
  assert.equal(fullyCancelled.status, "已取消");
});

/**
 * 迴歸測試：orderAmount 規格上是該品項的「訂單金額」小計，不是單價。
 * 過去把它當單價再乘上 quantity，數量大於 1 的品項金額會被放大。
 */
test("mo店+ 的 orderAmount 是品項小計，不再被數量重複相乘", () => {
  const [order] = mapMoStorePlusOrders([
    {
      orderNo: "MO-2F",
      listItem: [
        { goodsName: "保溫瓶", quantity: 3, orderAmount: 900 },
        { goodsName: "檯燈", quantity: 1, orderAmount: 1500 },
      ],
    },
  ]);

  assert.equal(order.totalAmount, 2400);
  assert.equal(order.items[0].qty, 3);
  assert.equal(order.items[0].price, 300);
  assert.equal(order.items[1].price, 1500);
});

test("mo店+ 從 listItem 品項層提取收件人姓名與地址", () => {
  const [withCustomer] = mapMoStorePlusOrders([
    {
      orderNo: "MO-2A",
      listItem: [
        {
          goodsName: "保溫瓶",
          customerName: "王小明",
          receiverAddress: "台北市信義區信義路五段7號",
        },
      ],
    },
  ]);
  assert.equal(withCustomer.customerName, "王小明");
  assert.equal(withCustomer.address, "台北市信義區信義路五段7號");

  const [withReceiverFallback] = mapMoStorePlusOrders([
    {
      orderNo: "MO-2B",
      listItem: [
        {
          goodsName: "保溫瓶",
          receiverName: "李小華",
          receiverAddress: "新北市板橋區縣民大道二段",
        },
      ],
    },
  ]);
  assert.equal(withReceiverFallback.customerName, "李小華");
  assert.equal(withReceiverFallback.address, "新北市板橋區縣民大道二段");
});

/**
 * 迴歸測試：mo店+ 過去直接把平台日期原樣塞進 createdAt，而 momo 會正規化成
 * YYYY-MM-DD。訂單日期在別處是以字串比較的，兩種格式混用會比出錯誤的結果。
 */
test("mo店+ 的訂單日期正規化成 YYYY-MM-DD", () => {
  assert.equal(
    mapMoStorePlusOrders([{ orderNo: "MO-3", listItem: [{ lastProcDate: "2026/8/5 13:20" }] }])[0].createdAt,
    "2026-08-05",
  );
  assert.equal(
    mapMoStorePlusOrders([{ orderNo: "MO-4", listItem: [{ lastProcDate: "2026-08-05" }] }])[0].createdAt,
    "2026-08-05",
  );
  assert.equal(
    mapMoStorePlusOrders([{ orderNo: "MO-5", listItem: [{ planShipDate: "2026/12/31 08:00" }] }])[0].createdAt,
    "2026-12-31",
  );
  assert.equal(mapMoStorePlusOrders([{ orderNo: "MO-6" }])[0].createdAt, "");
});

// 平台有時把數量與進價回成含逗號的字串，兩種型別都要算出同一個金額。
test.each([
  { given: "數字", orderQty: 3, buyPrice: 1200 },
  { given: "含逗號的字串", orderQty: "3", buyPrice: "1,200" },
])("momo 訂單商品接單統計在進價為$given時都算出同一筆金額", ({ orderQty, buyPrice }) => {
  const stats = mapMomoSalesStatistics([
    { goodsCode: "2000001", goodsName: "誠得保溫瓶 750ml", goodsDtInfo: "曜石黑", orderQty, buyPrice },
  ]);

  assert.equal(stats.revenue, 3600);
  assert.equal(stats.orderCount, 3);
});

/**
 * 迴歸測試：orderGoodsStatisticsQuery 的回應沒有任何日期欄位，過去 mapper 把統計列
 * 包成 createdAt 為空的假 OrderItem，總覽的走勢圖因此完全看不到 momo。
 * 現在統計就以統計的形態回傳，逐日資料留空由總覽自行處理。
 */
test("momo 訂單商品接單統計不提供逐日資料", () => {
  const stats = mapMomoSalesStatistics([
    { goodsCode: "2000002", goodsName: "保溫瓶", orderQty: 1, buyPrice: 100 },
  ]);

  assert.deepEqual(stats.daily, []);
});

test("momo 訂單商品接單統計扣除 claimQty，全數客退不計入成交", () => {
  const stats = mapMomoSalesStatistics([
    { goodsCode: "5000001", goodsName: "全退商品", goodsDtInfo: "綠色", orderQty: 1, claimQty: 1, buyPrice: 880 },
    { goodsCode: "4000001", goodsName: "部分客退商品", goodsDtInfo: "紅色", orderQty: 10, claimQty: 3, buyPrice: 500 },
  ]);

  // 全退那一筆完全不貢獻營收，只留下部分客退商品的 7 件。
  assert.equal(stats.orderCount, 7);
  assert.equal(stats.revenue, 3500); // 7 * 500
  // 客退數量是 momo 唯一的退貨訊號，兩列都要算進去。
  assert.equal(stats.returnCount, 4); // 1 + 3
});

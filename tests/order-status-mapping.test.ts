import assert from "node:assert/strict";
import { test } from "vitest";
import {
  mapMoStorePlusOrders,
  toMoStorePlusOrderStatus,
} from "@/app/lib/platforms/mo-store-plus-order-mapper";
import { mapMomoShippingOrders, mapMomoUnshippedOrders } from "@/app/lib/platforms/momo-order-mapper";
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

  const orders = mapMoStorePlusOrders([{ orderNo: "MO-1", status: "SomeNewStatus" }]);
  assert.equal(orders[0].status, "其他");
  const stats = orderStats(orders, "MO_STORE_PLUS");
  assert.equal(stats.pendingShipment, 0);
  assert.equal(stats.rmaCount, 0);
});

test("mo店+ 沒有訂單層狀態時改用第一個品項的狀態", () => {
  const orders = mapMoStorePlusOrders([
    { orderNo: "MO-2", listItem: [{ itemStatus: "NotShipped", goodsName: "保溫瓶" }] },
  ]);

  assert.equal(orders[0].status, "待發貨");
});

/**
 * 迴歸測試：mo店+ 過去直接把平台日期原樣塞進 createdAt，而 momo 會正規化成
 * YYYY-MM-DD。訂單日期在別處是以字串比較的，兩種格式混用會比出錯誤的結果。
 */
test("mo店+ 的訂單日期正規化成 YYYY-MM-DD", () => {
  assert.equal(mapMoStorePlusOrders([{ orderNo: "MO-3", createdAt: "2026/8/5 13:20" }])[0].createdAt, "2026-08-05");
  assert.equal(mapMoStorePlusOrders([{ orderNo: "MO-4", createdAt: "2026-08-05" }])[0].createdAt, "2026-08-05");
  assert.equal(
    mapMoStorePlusOrders([{ orderNo: "MO-5", listItem: [{ lastProcDate: "2026/12/31 08:00" }] }])[0].createdAt,
    "2026-12-31",
  );
  assert.equal(mapMoStorePlusOrders([{ orderNo: "MO-6" }])[0].createdAt, "");
});

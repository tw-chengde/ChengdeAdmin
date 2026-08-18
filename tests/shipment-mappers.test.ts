import assert from "node:assert/strict";
import { test } from "vitest";
import { mapMomoShipmentCandidates } from "@/app/lib/platforms/momo-shipment-mapper";
import {
  fixedRouteResolver,
  mapMoStorePlusShipmentCandidates,
  resolveStoreRouteByDeliveryCompany,
} from "@/app/lib/platforms/mo-store-plus-shipment-mapper";

test("momo shipment mapper 依 routeId 組出候選訂單並帶出併箱分組鍵", () => {
  const [candidate] = mapMomoShipmentCandidates(
    [
      {
        completeOrderNo: "MOMO-1",
        goodsName: "保溫瓶",
        goodsDtInfo: "黑",
        syslast: "2",
        salePrice: "100",
        Receiver: "王小明",
        storeIdName: "7-11 承德門市",
        custId: "CUST-1",
        goodsCode: "G1",
        goodsDtCode: "D1",
        lastPricDate: "2026/08/01 10:00",
      },
    ],
    "MOMO_MAIN:STORE",
  );

  assert.equal(candidate.id, "MOMO_MAIN:MOMO_MAIN:STORE:MOMO-1");
  assert.equal(candidate.platformCode, "MOMO_MAIN");
  assert.equal(candidate.routeId, "MOMO_MAIN:STORE");
  assert.equal(candidate.custId, "CUST-1");
  assert.equal(candidate.storeIdName, "7-11 承德門市");
  assert.equal(candidate.totalQty, 2);
  assert.equal(candidate.items[0].goodsCode, "G1");
  assert.equal(candidate.items[0].goodsdtCode, "D1");
});

test("momo shipment mapper 把同一張訂單的多列品項合併成一筆候選訂單", () => {
  const candidates = mapMomoShipmentCandidates(
    [
      { completeOrderNo: "MOMO-2", goodsName: "A", syslast: "1", salePrice: "10" },
      { completeOrderNo: "MOMO-2", goodsName: "B", syslast: "2", salePrice: "20" },
    ],
    "MOMO_MAIN:THIRD_PARTY",
  );

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].items.length, 2);
  assert.equal(candidates[0].totalQty, 3);
});

test("resolveStoreRouteByDeliveryCompany 依 deliveryCompany 分辨 7-11／全家", () => {
  assert.equal(resolveStoreRouteByDeliveryCompany({ deliveryCompany: "7-11店到店" }), "MO_STORE_PLUS:STORE:1");
  assert.equal(resolveStoreRouteByDeliveryCompany({ deliveryCompany: "全家店到店" }), "MO_STORE_PLUS:STORE:2");
  assert.equal(resolveStoreRouteByDeliveryCompany({ deliveryCompany: "未知物流" }), null);
  assert.equal(resolveStoreRouteByDeliveryCompany(undefined), null);
});

test("店+ shipment mapper 用 deliveryCompany 分流到正確的 routeId，判斷不出來的訂單被排除", () => {
  const candidates = mapMoStorePlusShipmentCandidates(
    [
      { orderNo: "MO-1", listItem: [{ goodsName: "保溫瓶", deliveryCompany: "7-11店到店", orderSeq: "001" }] },
      { orderNo: "MO-2", listItem: [{ goodsName: "檯燈", deliveryCompany: "全家店到店", orderSeq: "001" }] },
      { orderNo: "MO-3", listItem: [{ goodsName: "無法辨識", deliveryCompany: "未知", orderSeq: "001" }] },
    ],
    resolveStoreRouteByDeliveryCompany,
  );

  assert.deepEqual(
    candidates.map((c) => [c.orderNo, c.routeId]),
    [
      ["MO-1", "MO_STORE_PLUS:STORE:1"],
      ["MO-2", "MO_STORE_PLUS:STORE:2"],
    ],
  );
});

test("店+ shipment mapper 用 fixedRouteResolver 固定路徑（第三方物流）", () => {
  const [candidate] = mapMoStorePlusShipmentCandidates(
    [{ orderNo: "MO-4", listItem: [{ goodsName: "商品", orderSeq: "001" }] }],
    fixedRouteResolver("MO_STORE_PLUS:THIRD_PARTY"),
  );

  assert.equal(candidate.routeId, "MO_STORE_PLUS:THIRD_PARTY");
});

// 迴歸測試：舊版只取 listItem[0] 的 orderSeq，其餘品項的 orderSeq 出貨時會漏傳。
test("店+ shipment mapper 收齊訂單底下每個品項的 orderSeq，不只取第一筆", () => {
  const [candidate] = mapMoStorePlusShipmentCandidates(
    [
      {
        orderNo: "MO-5",
        listItem: [
          { goodsName: "A", deliveryCompany: "7-11店到店", orderSeq: "001" },
          { goodsName: "B", deliveryCompany: "7-11店到店", orderSeq: "002" },
        ],
      },
    ],
    resolveStoreRouteByDeliveryCompany,
  );

  assert.deepEqual(candidate.orderSeqs, ["001", "002"]);
});

test("mo-store-plus shipment mapper 排除運費品項顯示，但出貨時仍送出運費的 orderSeq", () => {
  const [candidate] = mapMoStorePlusShipmentCandidates(
    [
      {
        orderNo: "MO-FREIGHT-1",
        listItem: [
          { goodsName: "保溫瓶", deliveryCompany: "7-11店到店", orderSeq: "001", quantity: 2, orderAmount: 600 },
          { goodsName: "運費", goodsType: "運費", orderSeq: "002", quantity: 1, orderAmount: 60 },
        ],
      },
    ],
    resolveStoreRouteByDeliveryCompany,
  );

  assert.deepEqual(candidate.items.map((item) => item.name), ["保溫瓶"]);
  // 運費不列在可揀貨品項清單，但出貨確認仍要帶上它的 orderSeq，否則該品項不會被平台標記為已出貨。
  assert.deepEqual(candidate.orderSeqs, ["001", "002"]);
  assert.equal(candidate.totalQty, 2);
});

test("店+ shipment mapper 的 orderAmount 是品項小計，還原成單價", () => {
  const [candidate] = mapMoStorePlusShipmentCandidates(
    [{ orderNo: "MO-6", listItem: [{ goodsName: "商品", deliveryCompany: "全家店到店", quantity: 2, orderAmount: 400 }] }],
    resolveStoreRouteByDeliveryCompany,
  );

  assert.equal(candidate.items[0].price, 200);
  assert.equal(candidate.totalQty, 2);
});

test("mo store plus convenience candidates use warehouse-to-store delyGb", () => {
  const candidates = mapMoStorePlusShipmentCandidates(
    [
      { orderNo: "SEVEN", listItem: [{ deliveryCompany: "7-11店到店", orderSeq: "001" }] },
      { orderNo: "FAMILY-AMBIENT", listItem: [{ deliveryCompany: "全家店到店", deliveryTemp: "常溫", orderSeq: "001" }] },
      { orderNo: "FAMILY-FROZEN", listItem: [{ deliveryCompany: "全家店到店", deliveryTemp: "冷凍", orderSeq: "001" }] },
    ],
    resolveStoreRouteByDeliveryCompany,
  );

  assert.deepEqual(candidates.map((candidate) => [candidate.orderNo, candidate.storeDelyGb]), [
    ["SEVEN", "21"],
    ["FAMILY-AMBIENT", "27"],
    ["FAMILY-FROZEN", "23"],
  ]);
});

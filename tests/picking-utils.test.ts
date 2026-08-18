import assert from "node:assert/strict";
import { test } from "vitest";
import type { OrderItem } from "@/app/types/order";
import type { Product } from "@/app/types/product";
import type { ProductBinding } from "@/app/types/product-binding";
import { buildPickingSheet, pickingLineKey, unboundPlatformProducts } from "@/app/utils/picking";

function order(overrides: Partial<OrderItem> & Pick<OrderItem, "orderNo" | "items">): OrderItem {
  return {
    id: `id:${overrides.orderNo}`,
    channel: "MOMO 購物網",
    channelCode: "MOMO_MAIN",
    customerName: "客戶",
    address: "",
    totalAmount: 0,
    status: "待發貨",
    logistics: "",
    trackingNo: "",
    createdAt: "2026-08-01",
    ...overrides,
  };
}

function product(overrides: Partial<Product> & Pick<Product, "id" | "code">): Product {
  return {
    name: "本地商品",
    stock: 999,
    cvs_merge_limit: 0,
    logistics_merge_limit: 0,
    created_at: "2026-01-01",
    ...overrides,
  };
}

function binding(overrides: Partial<ProductBinding> & Pick<ProductBinding, "product_id" | "platform_code" | "goods_code">): ProductBinding {
  return { id: 1, goods_name: null, created_at: "2026-01-01", ...overrides };
}

test("pickingLineKey 依序退化：商品＋單品編號，其次商品編號＋規格，最後名稱＋規格", () => {
  assert.equal(
    pickingLineKey("MOMO_MAIN", { name: "保溫瓶", spec: "黑", qty: 1, price: 100, goodsCode: "G1", goodsdtCode: "D1" }),
    "MOMO_MAIN:code:G1:dt:D1",
  );
  assert.equal(
    pickingLineKey("MOMO_MAIN", { name: "保溫瓶", spec: "黑", qty: 1, price: 100, goodsCode: "G1" }),
    "MOMO_MAIN:code:G1:黑",
  );
  assert.equal(pickingLineKey("MOMO_MAIN", { name: "保溫瓶", spec: "黑", qty: 1, price: 100 }), "MOMO_MAIN:name:保溫瓶:黑");
});

test("同一單品跨訂單合併數量並累計訂單數", () => {
  const orders = [
    order({ orderNo: "A1", items: [{ name: "保溫瓶", spec: "黑", qty: 2, price: 100, goodsdtCode: "D1" }] }),
    order({ orderNo: "A2", items: [{ name: "保溫瓶", spec: "黑", qty: 3, price: 100, goodsdtCode: "D1" }] }),
  ];

  const sheet = buildPickingSheet(orders, [], []);

  assert.equal(sheet.groups.length, 1);
  assert.equal(sheet.groups[0].totalQty, 5);
  assert.equal(sheet.groups[0].orderCount, 2);
  assert.equal(sheet.totals.totalQty, 5);
  assert.equal(sheet.totals.orderCount, 2);
});

test("同一張訂單同一單品出現兩列時，數量要加、訂單數不能重複算", () => {
  const orders = [
    order({
      orderNo: "A1",
      items: [
        { name: "保溫瓶", spec: "黑", qty: 1, price: 100, goodsdtCode: "D1" },
        { name: "保溫瓶", spec: "黑", qty: 1, price: 100, goodsdtCode: "D1" },
      ],
    }),
  ];

  const sheet = buildPickingSheet(orders, [], []);

  assert.equal(sheet.groups[0].totalQty, 2);
  assert.equal(sheet.groups[0].orderCount, 1);
});

test("彙總待發貨與已印單訂單，其他狀態不列入揀貨單", () => {
  const orders = [
    order({ orderNo: "A1", status: "待發貨", items: [{ name: "保溫瓶", spec: "黑", qty: 1, price: 100, goodsdtCode: "D1" }] }),
    order({ orderNo: "A2", status: "已印單", items: [{ name: "保溫瓶", spec: "黑", qty: 2, price: 100, goodsdtCode: "D1" }] }),
    order({ orderNo: "A3", status: "已完成", items: [{ name: "保溫瓶", spec: "黑", qty: 9, price: 100, goodsdtCode: "D1" }] }),
  ];

  const sheet = buildPickingSheet(orders, [], []);

  assert.equal(sheet.groups[0].totalQty, 3);
  assert.equal(sheet.groups[0].orderCount, 2);
});

test("different product codes with the same variant code remain separate when unbound", () => {
  const orders = [
    order({ orderNo: "A1", items: [{ name: "Product A", spec: "Standard", qty: 1, price: 100, goodsCode: "G1", goodsdtCode: "001" }] }),
    order({ orderNo: "A2", items: [{ name: "Product B", spec: "Standard", qty: 1, price: 100, goodsCode: "G2", goodsdtCode: "001" }] }),
  ];

  const sheet = buildPickingSheet(orders, [], []);

  assert.equal(sheet.groups.length, 2);
  assert.deepEqual(
    sheet.groups.flatMap((group) => group.lines.map((line) => line.goodsCode)).sort(),
    ["G1", "G2"],
  );
});

test("跨平台同一本地商品依綁定併成一組", () => {
  const orders = [
    order({
      orderNo: "MO-1",
      channel: "MOMO 購物網",
      channelCode: "MOMO_MAIN",
      items: [{ name: "保溫瓶(momo)", spec: "黑", qty: 2, price: 100, goodsCode: "M1", goodsdtCode: "MD1" }],
    }),
    order({
      orderNo: "ST-1",
      channel: "Mo 店+",
      channelCode: "MO_STORE_PLUS",
      items: [{ name: "保溫瓶(店+)", spec: "黑", qty: 3, price: 100, goodsCode: "S1", goodsdtCode: "SD1" }],
    }),
  ];
  const products = [product({ id: 10, code: "CD-001" })];
  const bindings = [
    binding({ product_id: 10, platform_code: "MOMO_MAIN", goods_code: "M1" }),
    binding({ product_id: 10, platform_code: "MO_STORE_PLUS", goods_code: "S1" }),
  ];

  const sheet = buildPickingSheet(orders, bindings, products);

  assert.equal(sheet.groups.length, 1);
  assert.equal(sheet.groups[0].key, "product:10");
  assert.equal(sheet.groups[0].totalQty, 5);
  assert.equal(sheet.groups[0].lines.length, 2);
});

test("未綁定的平台商品各自成一組，且不判定庫存不足", () => {
  const orders = [
    order({ orderNo: "A1", items: [{ name: "未知商品A", spec: "", qty: 1, price: 0, goodsCode: "X1", goodsdtCode: "XD1" }] }),
    order({ orderNo: "A2", items: [{ name: "未知商品B", spec: "", qty: 1, price: 0, goodsCode: "X2", goodsdtCode: "XD2" }] }),
  ];

  const sheet = buildPickingSheet(orders, [], []);

  assert.equal(sheet.groups.length, 2);
  assert.equal(sheet.groups.every((group) => group.product === null), true);
  assert.equal(sheet.groups.every((group) => group.shortage === false), true);
  assert.equal(sheet.totals.unboundGroupCount, 2);
});

test("綁定存在但本地商品已刪除時標記 bindingOrphaned，不視為一般未綁定", () => {
  const orders = [order({ orderNo: "A1", items: [{ name: "商品", spec: "", qty: 1, price: 0, goodsCode: "G1" }] })];
  const bindings = [binding({ product_id: 999, platform_code: "MOMO_MAIN", goods_code: "G1", goods_name: "已刪除的商品" })];

  const sheet = buildPickingSheet(orders, bindings, []);

  assert.equal(sheet.groups.length, 1);
  assert.equal(sheet.groups[0].product, null);
  assert.equal(sheet.groups[0].bindingOrphaned, true);
  assert.equal(sheet.groups[0].fallbackName, "已刪除的商品");
});

test("庫存低於彙總數量時標記 shortage", () => {
  const orders = [order({ orderNo: "A1", items: [{ name: "商品", spec: "", qty: 20, price: 0, goodsCode: "G1" }] })];
  const products = [product({ id: 1, code: "CD-1", stock: 5 })];
  const bindings = [binding({ product_id: 1, platform_code: "MOMO_MAIN", goods_code: "G1" })];

  const sheet = buildPickingSheet(orders, bindings, products);

  assert.equal(sheet.groups[0].shortage, true);
  assert.equal(sheet.totals.shortageGroupCount, 1);
});

test("缺 goodsdtCode 時彙總鍵退化到商品編號＋規格，不同規格不會混在一起", () => {
  const orders = [
    order({ orderNo: "A1", items: [{ name: "T恤", spec: "黑 L", qty: 1, price: 0, goodsCode: "G1" }] }),
    order({ orderNo: "A2", items: [{ name: "T恤", spec: "白 M", qty: 1, price: 0, goodsCode: "G1" }] }),
  ];

  const sheet = buildPickingSheet(orders, [], []);

  // 同一個 goodsCode 但規格不同且未綁定時，要維持各自的群組。
  assert.equal(sheet.groups.length, 2);
  assert.ok(sheet.groups.every((group) => group.lines.length === 1));
  assert.deepEqual(
    sheet.groups.flatMap((group) => group.lines.map((line) => line.spec)).sort(),
    ["白 M", "黑 L"],
  );
});

test("完全認不出編號的訂單仍出現在揀貨單上，不會安靜消失", () => {
  const orders = [order({ orderNo: "A1", items: [{ name: "神秘商品", spec: "", qty: 1, price: 0 }] })];

  const sheet = buildPickingSheet(orders, [], []);

  assert.equal(sheet.groups.length, 1);
  assert.equal(sheet.groups[0].fallbackName, "神秘商品");
});

test("unboundPlatformProducts 只回傳有商品編號、未綁定的平台商品，並去重", () => {
  const orders = [
    order({ orderNo: "A1", items: [{ name: "商品A", spec: "規格1", qty: 1, price: 0, goodsCode: "G1" }] }),
    order({ orderNo: "A2", items: [{ name: "商品A", spec: "規格2", qty: 1, price: 0, goodsCode: "G1" }] }),
    order({ orderNo: "A3", items: [{ name: "無編號商品", spec: "", qty: 1, price: 0 }] }),
  ];

  const result = unboundPlatformProducts(buildPickingSheet(orders, [], []));

  assert.deepEqual(result, [{ platformCode: "MOMO_MAIN", goodsCode: "G1", name: "商品A" }]);
});

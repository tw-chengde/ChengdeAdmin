import assert from "node:assert/strict";
import { test } from "vitest";
import type { ShipmentCandidate } from "@/app/types/shipment";
import type { Product } from "@/app/types/product";
import type { ProductBinding } from "@/app/types/product-binding";
import {
  buildShipmentPlan,
  chunk,
  classifyPrintPayload,
  diffCandidates,
  planComboBoxes,
  resolveMomoOrderStates,
  shipmentResultMessage,
} from "@/app/utils/shipment";

test("shipmentResultMessage provides a reason when a failed result has none", () => {
  assert.equal(shipmentResultMessage("FAILED"), "平台未提供失敗原因");
  assert.equal(shipmentResultMessage("FAILED", "門市代碼失效"), "門市代碼失效");
  assert.equal(shipmentResultMessage("SUCCESS"), "—");
});

function candidate(overrides: Partial<ShipmentCandidate> & Pick<ShipmentCandidate, "orderNo">): ShipmentCandidate {
  return {
    id: `MOMO_MAIN:MOMO_MAIN:STORE:${overrides.orderNo}`,
    platformCode: "MOMO_MAIN",
    routeId: "MOMO_MAIN:STORE",
    orderSeqs: [],
    receiverName: "客戶",
    createdAt: "2026-08-01T00:00:00.000Z",
    items: [],
    totalQty: 0,
    logistics: "",
    ...overrides,
  };
}

function product(overrides: Partial<Product> & Pick<Product, "id">): Product {
  return {
    code: `CD-${overrides.id}`,
    name: "本地商品",
    stock: 999,
    cvs_merge_limit: 4,
    logistics_merge_limit: 4,
    created_at: "2026-01-01",
    ...overrides,
  };
}

function binding(overrides: Partial<ProductBinding> & Pick<ProductBinding, "product_id" | "goods_code">): ProductBinding {
  return { id: 1, platform_code: "MOMO_MAIN", goods_name: null, created_at: "2026-01-01", ...overrides };
}

test("chunk 依大小切批，非正數視為整批不切", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([1, 2, 3], 0), [[1, 2, 3]]);
  assert.deepEqual(chunk([], 5), []);
});

test("classifyPrintPayload 依內容判斷格式", () => {
  assert.equal(classifyPrintPayload("https://example.com/label.pdf"), "URL");
  assert.equal(classifyPrintPayload("JVBERi0xLjQK..."), "PDF_BASE64");
  assert.equal(classifyPrintPayload("data:application/pdf;base64,abcd"), "PDF_BASE64");
  assert.equal(classifyPrintPayload("<html><body>label</body></html>"), "HTML");
  assert.equal(classifyPrintPayload("不知道是什麼"), null);
});

test("diffCandidates 找出新增與消失的候選訂單", () => {
  const a = candidate({ orderNo: "A1" });
  const b = candidate({ orderNo: "A2" });
  const c = candidate({ orderNo: "A3" });

  const diff = diffCandidates([a.id, b.id], [b, c]);

  assert.deepEqual(diff.added, [c.id]);
  assert.deepEqual(diff.removed, [a.id]);
});

test("resolveMomoOrderStates：重複操作視為成功", () => {
  const states = resolveMomoOrderStates(["A1"], [{ confirmRepeatList: ["A1"] }]);
  assert.deepEqual(states.get("A1"), { state: "ALREADY_DONE", message: undefined });
});

test("resolveMomoOrderStates：完全沒出現在任何清單的訂單視為失敗", () => {
  const states = resolveMomoOrderStates(["A1", "A2"], [{ confirmOkList: ["A1"] }]);
  assert.deepEqual(states.get("A1"), { state: "SUCCESS", message: undefined });
  assert.equal(states.get("A2")?.state, "FAILED");
  assert.match(states.get("A2")?.message ?? "", /平台未回報/);
});

test("resolveMomoOrderStates：清單項目帶訊息時解析出錯誤原因", () => {
  const states = resolveMomoOrderStates(["A1"], [{ confirmFailList: ["A1 : 門市代碼失效"] }]);
  assert.deepEqual(states.get("A1"), { state: "FAILED", message: "門市代碼失效" });
});

test("resolveMomoOrderStates：成功清單附物流單號時仍以訂單編號判定成功", () => {
  const orderNo = "26081822267115-001-001-001";
  const states = resolveMomoOrderStates([orderNo], [{ confirmOkList: [`${orderNo} --- 4507914865`] }]);
  assert.deepEqual(states.get(orderNo), { state: "SUCCESS", message: undefined });
});

test("resolveMomoOrderStates：彙總多個 resultInfo 物件", () => {
  const states = resolveMomoOrderStates(
    ["A1", "A2", "A3"],
    [{ confirmOkList: ["A1"] }, { confirmFailList: ["A2"] }, { confirmRepeatList: ["A3"] }],
  );
  assert.equal(states.get("A1")?.state, "SUCCESS");
  assert.equal(states.get("A2")?.state, "FAILED");
  assert.equal(states.get("A3")?.state, "ALREADY_DONE");
});

test("buildShipmentPlan 同一路徑的訂單維持單一批次，讓 momo 一次確認並列印", () => {
  const orders = Array.from({ length: 120 }, (_, index) => candidate({ orderNo: `A${index + 1}` }));
  const plan = buildShipmentPlan({
    candidates: orders,
    routes: new Map([["MOMO_MAIN:STORE", { label: "超商取貨", steps: [], requiresPackaging: false }]]),
    packagingByRoute: new Map(),
    now: new Date("2026-08-16T00:00:00Z"),
  });

  assert.equal(plan.groups.length, 1);
  assert.equal(plan.groups[0].routeLabel, "超商取貨");
  assert.deepEqual(
    plan.groups[0].batches.map((batch) => batch.orderNos),
    [orders.map((order) => order.orderNo)],
  );
  assert.equal(plan.totals.orderCount, 120);
  assert.equal(plan.totals.automatableOrderCount, 120);
  assert.equal(plan.preparedAt, "2026-08-16T00:00:00.000Z");
});

test("buildShipmentPlan：需要包材但未設定的路徑標記 blocked，不產生 batches", () => {
  const orders = [candidate({ orderNo: "A1" })];
  const plan = buildShipmentPlan({
    candidates: orders,
    routes: new Map([["MOMO_MAIN:STORE", { label: "超商取貨", steps: [], requiresPackaging: true }]]),
    packagingByRoute: new Map(),
  });

  assert.equal(plan.groups[0].blocked, "PACKAGING_NOT_CONFIGURED");
  assert.deepEqual(plan.groups[0].batches, []);
  assert.equal(plan.totals.automatableOrderCount, 0);
  assert.equal(plan.warnings.length, 1);
});

// planComboBoxes ------------------------------------------------------------

const boundProduct = product({ id: 1, cvs_merge_limit: 4 });
const zeroLimitProduct = product({ id: 2, cvs_merge_limit: 0 });
const bindings: ProductBinding[] = [
  binding({ product_id: 1, goods_code: "G1" }),
  binding({ product_id: 2, goods_code: "G0" }),
];
const products: Product[] = [boundProduct, zeroLimitProduct];

function storeOrder(orderNo: string, createdAt: string, qty: number, goodsCode = "G1", store = "S1", cust = "C1") {
  return candidate({
    orderNo,
    createdAt,
    storeIdName: store,
    custId: cust,
    items: [{ name: "商品", spec: "", qty, price: 0, goodsCode }],
  });
}

test("planComboBoxes：同門市同客的訂單併進同一箱", () => {
  const orders = [storeOrder("A1", "2026-08-01T00:00:00Z", 1), storeOrder("A2", "2026-08-01T00:01:00Z", 1)];
  const result = planComboBoxes(orders, "STORE", bindings, products);

  assert.equal(result.get("A1"), "1");
  assert.equal(result.get("A2"), "1");
});

test("planComboBoxes：跨門市或跨客不併箱", () => {
  const orders = [
    storeOrder("A1", "2026-08-01T00:00:00Z", 1, "G1", "S1", "C1"),
    storeOrder("A2", "2026-08-01T00:01:00Z", 1, "G1", "S2", "C1"),
    storeOrder("A3", "2026-08-01T00:02:00Z", 1, "G1", "S1", "C2"),
  ];
  const result = planComboBoxes(orders, "STORE", bindings, products);

  // 三筆訂單分屬三個不同目的地，各自都只有一筆，全部退回 "00"。
  assert.equal(result.get("A1"), "00");
  assert.equal(result.get("A2"), "00");
  assert.equal(result.get("A3"), "00");
});

test("planComboBoxes：任一品項綁定的商品併單上限為 0，訂單恆不併箱", () => {
  const orders = [
    storeOrder("A1", "2026-08-01T00:00:00Z", 1, "G0"),
    storeOrder("A2", "2026-08-01T00:01:00Z", 1, "G1"),
  ];
  const result = planComboBoxes(orders, "STORE", bindings, products);

  assert.equal(result.get("A1"), "00");
  // A2 因為目的地只剩自己一筆可併裝訂單，封箱後 < 2 筆一樣退回 00。
  assert.equal(result.get("A2"), "00");
});

test("planComboBoxes：封箱後累計數量超過上限就切下一箱", () => {
  const orders = [
    storeOrder("A1", "2026-08-01T00:00:00Z", 2),
    storeOrder("A2", "2026-08-01T00:01:00Z", 2),
    storeOrder("A3", "2026-08-01T00:02:00Z", 2),
    storeOrder("A4", "2026-08-01T00:03:00Z", 2),
  ];
  // cvs_merge_limit = 4：A1+A2 = 4（剛好），A3 加入會變 6 超過上限，需切新箱。
  const result = planComboBoxes(orders, "STORE", bindings, products);

  assert.equal(result.get("A1"), "1");
  assert.equal(result.get("A2"), "1");
  assert.equal(result.get("A3"), "2");
  assert.equal(result.get("A4"), "2");
});

test("planComboBoxes：封箱後箱內只剩 1 筆退回 00", () => {
  const orders = [
    storeOrder("A1", "2026-08-01T00:00:00Z", 4),
    storeOrder("A2", "2026-08-01T00:01:00Z", 4),
  ];
  // 第一筆就已達上限 4，第二筆會超過，因此各自封箱且箱內都只有 1 筆。
  const result = planComboBoxes(orders, "STORE", bindings, products);

  assert.equal(result.get("A1"), "00");
  assert.equal(result.get("A2"), "00");
});

test("planComboBoxes：未綁定的品項不設限", () => {
  const orders = [
    storeOrder("A1", "2026-08-01T00:00:00Z", 100, "UNBOUND"),
    storeOrder("A2", "2026-08-01T00:01:00Z", 100, "UNBOUND"),
  ];
  const result = planComboBoxes(orders, "STORE", bindings, products);

  assert.equal(result.get("A1"), "1");
  assert.equal(result.get("A2"), "1");
});

test("planComboBoxes：THIRD_PARTY 路徑只看 custId，不看門市", () => {
  const orders = [
    storeOrder("A1", "2026-08-01T00:00:00Z", 1, "G1", "S1", "C1"),
    storeOrder("A2", "2026-08-01T00:01:00Z", 1, "G1", "S2", "C1"),
  ];
  const result = planComboBoxes(orders, "THIRD_PARTY", bindings, products);

  assert.equal(result.get("A1"), "1");
  assert.equal(result.get("A2"), "1");
});

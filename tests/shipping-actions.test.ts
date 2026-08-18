import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { momoDefinition, moStorePlusDefinition } from "@/app/lib/platforms/definitions";

const getEnabledConnectors = vi.fn();
const getConnector = vi.fn();
const listEnabledPlatformCodes = vi.fn();
const listProductBindings = vi.fn();
const listProducts = vi.fn();

vi.mock("@/app/lib/platforms/registry", () => ({
  getEnabledConnectors: (...args: unknown[]) => getEnabledConnectors(...args),
  getConnector: (...args: unknown[]) => getConnector(...args),
}));
vi.mock("@/app/dashboard/platforms-actions", () => ({
  listEnabledPlatformCodes: () => listEnabledPlatformCodes(),
}));
vi.mock("@/app/dashboard/merge-actions", () => ({
  listProductBindings: () => listProductBindings(),
}));
vi.mock("@/app/dashboard/products-actions", () => ({
  listProducts: () => listProducts(),
}));

const { loadShipmentWorkspace, previewShipmentPlan, confirmShipmentPlan, executeShipmentBatch } = await import(
  "@/app/dashboard/shipping-actions"
);

const dateRange = { startDate: "2026-08-01", endDate: "2026-08-07" };

beforeEach(() => {
  vi.clearAllMocks();
  listEnabledPlatformCodes.mockResolvedValue(["MOMO_MAIN", "MO_STORE_PLUS"]);
  listProductBindings.mockResolvedValue([]);
  listProducts.mockResolvedValue([]);
});

test("loadShipmentWorkspace combines each platform's unprocessed shippable orders", async () => {
  const momoFetchPickingSheetOrders = vi.fn().mockResolvedValue([{ id: "momo-unshipped" }]);
  const storeFetchPickingSheetOrders = vi.fn().mockResolvedValue([{ id: "store-unshipped" }]);
  getEnabledConnectors.mockReturnValue([
    { definition: momoDefinition, fetchPickingSheetOrders: momoFetchPickingSheetOrders },
    { definition: moStorePlusDefinition, fetchPickingSheetOrders: storeFetchPickingSheetOrders },
  ]);
  listProductBindings.mockResolvedValue([{ id: 1, product_id: 1, platform_code: "MOMO_MAIN", goods_code: "G1" }]);
  listProducts.mockResolvedValue([{ id: 1, code: "CD-1" }]);

  const result = await loadShipmentWorkspace(dateRange);

  assert.deepEqual(
    result.orders.map((order) => order.id),
    ["momo-unshipped", "store-unshipped"],
  );
  assert.deepEqual(result.bindings, [{ id: 1, product_id: 1, platform_code: "MOMO_MAIN", goods_code: "G1" }]);
  assert.deepEqual(result.products, [{ id: 1, code: "CD-1" }]);
  assert.deepEqual(result.failures, []);

  // 平台 connector 負責各自的已印單 API / 狀態參數；工作區只傳共用日期範圍。
  assert.deepEqual(momoFetchPickingSheetOrders.mock.calls[0][0], {
    from: new Date("2026-08-01T00:00:00.000+08:00"),
    to: new Date("2026-08-07T23:59:59.999+08:00"),
  });
  assert.deepEqual(storeFetchPickingSheetOrders.mock.calls[0][0], {
    from: new Date("2026-08-01T00:00:00.000+08:00"),
    to: new Date("2026-08-07T23:59:59.999+08:00"),
  });
});

test("loadShipmentWorkspace 單一平台查詢失敗時回報 failures，不阻擋其他平台", async () => {
  const failingFetch = vi.fn().mockRejectedValue(new Error("proxy 未設定"));
  const okFetch = vi.fn().mockResolvedValue([{ id: "store-1" }]);
  getEnabledConnectors.mockReturnValue([
    { definition: momoDefinition, fetchPickingSheetOrders: failingFetch },
    { definition: moStorePlusDefinition, fetchPickingSheetOrders: okFetch },
  ]);

  const result = await loadShipmentWorkspace(dateRange);

  assert.deepEqual(
    result.orders.map((order) => order.id),
    ["store-1"],
  );
  assert.deepEqual(result.failures, [{ platformCode: "MOMO_MAIN", message: "proxy 未設定" }]);
});

test("loadShipmentWorkspace 只查目前啟用的平台", async () => {
  listEnabledPlatformCodes.mockResolvedValue(["MO_STORE_PLUS"]);
  const fetchPickingSheetOrders = vi.fn().mockResolvedValue([]);
  getEnabledConnectors.mockReturnValue([{ definition: moStorePlusDefinition, fetchPickingSheetOrders }]);

  await loadShipmentWorkspace(dateRange);

  assert.deepEqual(getEnabledConnectors.mock.calls[0][0], ["MO_STORE_PLUS"]);
});

test("loadShipmentWorkspace 日期超過 30 天時拒絕查詢", async () => {
  getEnabledConnectors.mockReturnValue([]);

  await assert.rejects(loadShipmentWorkspace({ startDate: "2026-01-01", endDate: "2026-03-01" }));
});

// previewShipmentPlan / confirmShipmentPlan --------------------------------

function candidate(overrides: { id: string; orderNo: string; routeId: string; platformCode?: "MOMO_MAIN" | "MO_STORE_PLUS" }) {
  return {
    platformCode: "MOMO_MAIN" as const,
    orderSeqs: [],
    receiverName: "客戶",
    createdAt: "2026-08-01",
    items: [],
    totalQty: 1,
    logistics: "",
    ...overrides,
  };
}

test("previewShipmentPlan 彙整所有已啟用平台的候選訂單並依路徑分組", async () => {
  const momoCandidates = vi.fn().mockResolvedValue([candidate({ id: "m1", orderNo: "M1", routeId: "MOMO_MAIN:STORE" })]);
  const storeCandidates = vi
    .fn()
    .mockResolvedValue([candidate({ id: "s1", orderNo: "S1", routeId: "MO_STORE_PLUS:THIRD_PARTY", platformCode: "MO_STORE_PLUS" })]);
  getEnabledConnectors.mockReturnValue([
    { definition: momoDefinition, fetchShipmentCandidates: momoCandidates },
    { definition: moStorePlusDefinition, fetchShipmentCandidates: storeCandidates },
  ]);

  const plan = await previewShipmentPlan(dateRange);

  assert.equal(plan.totals.orderCount, 2);
  assert.deepEqual(
    plan.groups.map((group) => group.routeId).sort(),
    ["MOMO_MAIN:STORE", "MO_STORE_PLUS:THIRD_PARTY"],
  );
});

test("previewShipmentPlan 用 selectedIds 只保留指定的候選訂單", async () => {
  const momoCandidates = vi
    .fn()
    .mockResolvedValue([
      candidate({ id: "m1", orderNo: "M1", routeId: "MOMO_MAIN:STORE" }),
      candidate({ id: "m2", orderNo: "M2", routeId: "MOMO_MAIN:STORE" }),
    ]);
  getEnabledConnectors.mockReturnValue([{ definition: momoDefinition, fetchShipmentCandidates: momoCandidates }]);

  const plan = await previewShipmentPlan(dateRange, ["m1"]);

  assert.equal(plan.totals.orderCount, 1);
  assert.deepEqual(
    plan.groups[0].orders.map((order) => order.orderNo),
    ["M1"],
  );
});

test("previewShipmentPlan 忽略未實作 fetchShipmentCandidates 的連接器", async () => {
  getEnabledConnectors.mockReturnValue([{ definition: momoDefinition, fetchOrders: vi.fn() }]);

  const plan = await previewShipmentPlan(dateRange);

  assert.deepEqual(plan.groups, []);
});

test("previewShipmentPlan keeps available candidates when another platform request fails", async () => {
  const momoCandidates = vi.fn().mockRejectedValue(new Error("momo temporarily unavailable"));
  const storeCandidates = vi
    .fn()
    .mockResolvedValue([candidate({ id: "s1", orderNo: "S1", routeId: "MO_STORE_PLUS:THIRD_PARTY", platformCode: "MO_STORE_PLUS" })]);
  getEnabledConnectors.mockReturnValue([
    { definition: momoDefinition, fetchShipmentCandidates: momoCandidates },
    { definition: moStorePlusDefinition, fetchShipmentCandidates: storeCandidates },
  ]);

  const plan = await previewShipmentPlan(dateRange);

  assert.deepEqual(plan.groups.map((group) => group.orders.map((order) => order.orderNo)), [["S1"]]);
  assert.match(plan.warnings[0]?.message ?? "", /momo temporarily unavailable/);
});

test("confirmShipmentPlan 回報預覽後消失／新增的候選訂單（drift）", async () => {
  const fetchShipmentCandidates = vi
    .fn()
    .mockResolvedValue([
      candidate({ id: "m1", orderNo: "M1", routeId: "MOMO_MAIN:STORE" }),
      candidate({ id: "m3", orderNo: "M3", routeId: "MOMO_MAIN:STORE" }),
    ]);
  getEnabledConnectors.mockReturnValue([{ definition: momoDefinition, fetchShipmentCandidates }]);

  const { plan, drift } = await confirmShipmentPlan(dateRange, ["m1", "m2"]);

  assert.deepEqual(drift.removed, ["m2"]); // 預覽時有、現在查不到
  assert.deepEqual(drift.added, ["m3"]); // 預覽之後才出現
  assert.deepEqual(
    plan.groups[0].orders.map((order) => order.orderNo),
    ["M1"],
  ); // 計畫只含仍然存在且原本就選取的 m1
});

// executeShipmentBatch ------------------------------------------------------

const executeInput = { dateRange, platformCode: "MOMO_MAIN" as const, routeId: "MOMO_MAIN:STORE", orderNos: ["M1"] };

test("executeShipmentBatch：平台未啟用時全部標記 SKIPPED", async () => {
  listEnabledPlatformCodes.mockResolvedValue([]);

  const result = await executeShipmentBatch(executeInput);

  assert.deepEqual(result, { routeId: "MOMO_MAIN:STORE", results: [{ orderNo: "M1", state: "SKIPPED" }], documents: [] });
  assert.equal(getConnector.mock.calls.length, 0);
});

test("executeShipmentBatch：connector 沒有 shipBatch 時全部標記 SKIPPED", async () => {
  getConnector.mockReturnValue({ definition: momoDefinition, fetchShipmentCandidates: vi.fn() });

  const result = await executeShipmentBatch(executeInput);

  assert.equal(result.results[0]?.state, "SKIPPED");
});

test("executeShipmentBatch：不信任 client 傳來的 routeId，不存在的路徑一律 SKIPPED", async () => {
  getConnector.mockReturnValue({ definition: momoDefinition, fetchShipmentCandidates: vi.fn(), shipBatch: vi.fn() });

  const result = await executeShipmentBatch({ ...executeInput, routeId: "MOMO_MAIN:NOT_A_REAL_ROUTE" });

  assert.equal(result.results[0]?.state, "SKIPPED");
});

test("executeShipmentBatch：需要包材但環境變數未設定時全部 SKIPPED，不呼叫 shipBatch", async () => {
  delete process.env.MOMO_SCM_SHIP_PACK;
  delete process.env.MOMO_SCM_PACK_TYPE;
  delete process.env.MOMO_SCM_PACK_UNIT;
  const shipBatch = vi.fn();
  getConnector.mockReturnValue({ definition: momoDefinition, fetchShipmentCandidates: vi.fn().mockResolvedValue([]), shipBatch });

  const result = await executeShipmentBatch(executeInput);

  assert.equal(result.results[0]?.state, "SKIPPED");
  assert.equal(shipBatch.mock.calls.length, 0);
});

test("executeShipmentBatch：成功時把重查到的候選訂單、綁定與商品交給 connector.shipBatch", async () => {
  process.env.MOMO_SCM_SHIP_PACK = "紙箱";
  process.env.MOMO_SCM_PACK_TYPE = "標準";
  process.env.MOMO_SCM_PACK_UNIT = "1";
  const target = candidate({ id: "m1", orderNo: "M1", routeId: "MOMO_MAIN:STORE" });
  const other = candidate({ id: "m2", orderNo: "M2", routeId: "MOMO_MAIN:STORE" });
  const fetchShipmentCandidates = vi.fn().mockResolvedValue([target, other]);
  const shipBatch = vi.fn().mockResolvedValue({ routeId: "MOMO_MAIN:STORE", results: [{ orderNo: "M1", state: "SUCCESS" }], documents: [] });
  getConnector.mockReturnValue({ definition: momoDefinition, fetchShipmentCandidates, shipBatch });
  listProductBindings.mockResolvedValue([{ id: 1, product_id: 1, platform_code: "MOMO_MAIN", goods_code: "G1" }]);
  listProducts.mockResolvedValue([{ id: 1, code: "CD-1" }]);

  const result = await executeShipmentBatch(executeInput);

  const request = shipBatch.mock.calls[0][0];
  assert.deepEqual(
    request.candidates.map((c: { orderNo: string }) => c.orderNo),
    ["M1"],
  ); // 只送出這批請求的 orderNo，不含同路徑但沒被選取的 M2
  assert.deepEqual(request.packaging, { shipPack: "紙箱", packType: "標準", packUnit: "1" });
  assert.equal(request.bindings.length, 1);
  assert.equal(request.products.length, 1);
  assert.deepEqual(result.results, [{ orderNo: "M1", state: "SUCCESS" }]);

  delete process.env.MOMO_SCM_SHIP_PACK;
  delete process.env.MOMO_SCM_PACK_TYPE;
  delete process.env.MOMO_SCM_PACK_UNIT;
});

test("executeShipmentBatch：請求的訂單重查後已消失，標記 SKIPPED 而非從結果中無聲消失", async () => {
  process.env.MOMO_SCM_SHIP_PACK = "紙箱";
  process.env.MOMO_SCM_PACK_TYPE = "標準";
  process.env.MOMO_SCM_PACK_UNIT = "1";
  const target = candidate({ id: "m1", orderNo: "M1", routeId: "MOMO_MAIN:STORE" });
  // M2 在重查時已經不在候選清單裡（例如平台端狀態已變動）。
  const fetchShipmentCandidates = vi.fn().mockResolvedValue([target]);
  const shipBatch = vi.fn().mockResolvedValue({ routeId: "MOMO_MAIN:STORE", results: [{ orderNo: "M1", state: "SUCCESS" }], documents: [] });
  getConnector.mockReturnValue({ definition: momoDefinition, fetchShipmentCandidates, shipBatch });

  const result = await executeShipmentBatch({ ...executeInput, orderNos: ["M1", "M2"] });

  assert.deepEqual(result.results, [
    { orderNo: "M1", state: "SUCCESS" },
    { orderNo: "M2", state: "SKIPPED" },
  ]);

  delete process.env.MOMO_SCM_SHIP_PACK;
  delete process.env.MOMO_SCM_PACK_TYPE;
  delete process.env.MOMO_SCM_PACK_UNIT;
});

test("executeShipmentBatch：connector 整批 throw 時捕捉成全部 FAILED，不讓整頁炸掉", async () => {
  const fetchShipmentCandidates = vi.fn().mockResolvedValue([candidate({ id: "s1", orderNo: "S1", routeId: "MO_STORE_PLUS:THIRD_PARTY" })]);
  const shipBatch = vi.fn().mockRejectedValue(new Error("平台連線逾時"));
  getConnector.mockReturnValue({ definition: moStorePlusDefinition, fetchShipmentCandidates, shipBatch });

  const result = await executeShipmentBatch({
    dateRange,
    platformCode: "MO_STORE_PLUS",
    routeId: "MO_STORE_PLUS:THIRD_PARTY",
    orderNos: ["S1"],
  });

  assert.deepEqual(result.results, [{ orderNo: "S1", state: "FAILED", message: "平台連線逾時" }]);
});

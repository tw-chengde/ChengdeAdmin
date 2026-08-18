import assert from "node:assert/strict";
import { test } from "vitest";
import { getAllPlatformDefinitions } from "@/app/lib/platforms/definitions";

const definitions = getAllPlatformDefinitions();
const allRoutes = definitions.flatMap((definition) => definition.shipRoutes ?? []);

test("shipRoutes[].id 全域唯一", () => {
  const ids = allRoutes.map((route) => route.id);
  assert.equal(new Set(ids).size, ids.length);
});

// 廠商配送（momo）與宅配（店+）不納入自動化路徑：不以 automatable:false 佔位，直接不出現在 shipRoutes 裡。
test("shipRoutes 不含廠商配送與宅配", () => {
  const ids = allRoutes.map((route) => route.id);
  assert.ok(!ids.some((id) => id.includes("COMPANY")));
  assert.ok(!ids.some((id) => id.includes("HOME")));
});

test("目前所有路徑一律 automatable", () => {
  assert.ok(allRoutes.every((route) => route.automatable === true));
});

test("requiresPackaging 的路徑一定 automatable", () => {
  assert.ok(allRoutes.filter((route) => route.requiresPackaging).every((route) => route.automatable));
});

test("所有 MO_STORE_PLUS 路徑一律 requiresPackaging: false", () => {
  const storePlusRoutes = allRoutes.filter((route) => route.id.startsWith("MO_STORE_PLUS:"));
  assert.ok(storePlusRoutes.length > 0, "應至少有一條 MO_STORE_PLUS 路徑");
  assert.ok(storePlusRoutes.every((route) => route.requiresPackaging === false));
});

test("momo 的兩條路徑皆需要包材設定", () => {
  const momoRoutes = allRoutes.filter((route) => route.id.startsWith("MOMO_MAIN:"));
  assert.deepEqual(
    momoRoutes.map((route) => route.id),
    ["MOMO_MAIN:STORE", "MOMO_MAIN:THIRD_PARTY"],
  );
  assert.ok(momoRoutes.every((route) => route.requiresPackaging === true));
});

test("momo 出貨步驟與實際 API 呼叫順序一致：併箱、出貨確認、列印標籤", () => {
  const momoRoutes = allRoutes.filter((route) => route.id.startsWith("MOMO_MAIN:"));
  assert.deepEqual(
    momoRoutes.map((route) => route.steps.map((step) => step.id)),
    [
      ["combine", "confirm", "print"],
      ["combine", "confirm", "print"],
    ],
  );
});

test("店+ 有三條路徑：7-11、全家、第三方物流", () => {
  const storePlusRoutes = allRoutes.filter((route) => route.id.startsWith("MO_STORE_PLUS:"));
  assert.deepEqual(
    storePlusRoutes.map((route) => route.id),
    ["MO_STORE_PLUS:STORE:1", "MO_STORE_PLUS:STORE:2", "MO_STORE_PLUS:THIRD_PARTY"],
  );
});

test("每條路徑至少有一個步驟，且都會產出文件", () => {
  for (const route of allRoutes) {
    assert.ok(route.steps.length > 0, `${route.id} 應至少有一個步驟`);
    assert.equal(route.producesDocument, true);
  }
});

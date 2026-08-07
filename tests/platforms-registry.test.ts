import assert from "node:assert/strict";
import { test } from "vitest";
import {
  getAllPlatformDefinitions,
  getConnector,
  getEnabledConnectors,
} from "@/app/lib/platforms/registry";

test("getAllPlatformDefinitions 依註冊順序回傳 MOMO 購物網、Mo 店+", () => {
  const defs = getAllPlatformDefinitions();
  assert.deepEqual(
    defs.map((d) => d.code),
    ["MOMO_MAIN", "MO_STORE_PLUS"],
  );
  assert.equal(defs[0].name, "MOMO 購物網");
  assert.equal(defs[1].name, "Mo 店+");
});

test("getConnector 找得到已註冊的平台，找不到未知代碼", () => {
  assert.equal(getConnector("MOMO_MAIN")?.definition.name, "MOMO 購物網");
  assert.equal(getConnector("MO_STORE_PLUS")?.definition.name, "Mo 店+");
  assert.equal(getConnector("UNKNOWN" as never), undefined);
});

test("getEnabledConnectors 只回傳啟用中的平台，忽略未知代碼", () => {
  assert.deepEqual(
    getEnabledConnectors(["MOMO_MAIN"]).map((c) => c.definition.code),
    ["MOMO_MAIN"],
  );
  assert.deepEqual(getEnabledConnectors([]), []);
  assert.deepEqual(
    getEnabledConnectors(["MO_STORE_PLUS", "UNKNOWN" as never]).map((c) => c.definition.code),
    ["MO_STORE_PLUS"],
  );
});

test("每個 connector 只回傳自己通路的訂單", async () => {
  for (const def of getAllPlatformDefinitions()) {
    const orders = await getConnector(def.code)!.fetchOrders();
    assert.ok(orders.length > 0, `${def.code} 應有 mock 訂單可供測試`);
    assert.ok(orders.every((o) => o.channelCode === def.code));
  }
});

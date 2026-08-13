import assert from "node:assert/strict";
import { test } from "vitest";
import { mergePlatformStatuses } from "@/app/utils/platforms";
// 直接用正式的平台定義，避免測試裡再抄一份會各自漂移的副本。
import { momoDefinition as momoDef, moStorePlusDefinition as moStorePlusDef } from "@/app/lib/platforms/definitions";

test("mergePlatformStatuses 沒有對應資料列時預設為啟用", () => {
  const result = mergePlatformStatuses([momoDef], []);
  assert.deepEqual(result, [{ code: "MOMO_MAIN", name: "MOMO 購物網", logo: "/images/momo.png", enabled: true }]);
});

test("mergePlatformStatuses 依 D1 資料列標記停用", () => {
  const result = mergePlatformStatuses([momoDef, moStorePlusDef], [{ code: "MOMO_MAIN", enabled: false }]);
  assert.equal(result.find((r) => r.code === "MOMO_MAIN")?.enabled, false);
  assert.equal(result.find((r) => r.code === "MO_STORE_PLUS")?.enabled, true);
});

test("mergePlatformStatuses 明確啟用的資料列維持啟用", () => {
  const result = mergePlatformStatuses([momoDef], [{ code: "MOMO_MAIN", enabled: true }]);
  assert.equal(result[0].enabled, true);
});

test("mergePlatformStatuses 忽略 registry 中不存在的未知代碼", () => {
  const result = mergePlatformStatuses([momoDef], [{ code: "UNKNOWN_PLATFORM", enabled: false }]);
  assert.deepEqual(
    result.map((r) => r.code),
    ["MOMO_MAIN"],
  );
  assert.equal(result[0].enabled, true);
});

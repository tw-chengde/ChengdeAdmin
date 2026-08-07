import assert from "node:assert/strict";
import { test } from "vitest";
import { mergePlatformStatuses } from "@/app/utils/platforms";
import type { PlatformDefinition } from "@/app/lib/platforms/types";

const momoDef: PlatformDefinition = {
  code: "MOMO_MAIN",
  name: "MOMO 購物網",
  logo: "/images/momo.png",
  logoObjectFit: "contain",
  color: "#ec008c",
  bgcolor: "rgba(236, 0, 140, 0.08)",
  borderColor: "rgba(236, 0, 140, 0.25)",
  gradient: "linear-gradient(135deg, #ec008c, #d80073)",
};
const moStorePlusDef: PlatformDefinition = {
  code: "MO_STORE_PLUS",
  name: "Mo 店+",
  logo: "/images/mo-store.jpg",
  logoObjectFit: "cover",
  color: "#ff6b00",
  bgcolor: "rgba(255, 107, 0, 0.08)",
  borderColor: "rgba(255, 107, 0, 0.25)",
  gradient: "linear-gradient(135deg, #ff6b00, #ea580c)",
};

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

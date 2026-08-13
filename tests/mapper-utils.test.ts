import assert from "node:assert/strict";
import { test } from "vitest";
import {
  groupBy,
  normalizeOrderDate,
  optionalNumber,
  optionalText,
  toFiniteNumber,
} from "@/app/lib/platforms/mapper-utils";

test("optionalText 去空白，空字串與非字串一律視為沒有值", () => {
  assert.equal(optionalText("  CD-1001  "), "CD-1001");
  assert.equal(optionalText(""), null);
  assert.equal(optionalText("   "), null);
  assert.equal(optionalText(undefined), null);
  assert.equal(optionalText(null), null);
  // 平台偶爾會把編號回成數字，這種情況沒有可信的字串值可用。
  assert.equal(optionalText(1000000), null);
});

test("optionalNumber 區分「沒有值」與「值為 0」", () => {
  assert.equal(optionalNumber(0), 0);
  assert.equal(optionalNumber("1280"), 1280);
  assert.equal(optionalNumber(""), null);
  assert.equal(optionalNumber(null), null);
  assert.equal(optionalNumber(undefined), null);
  assert.equal(optionalNumber("免費"), null);
});

test("toFiniteNumber 讓缺值與髒資料都退回 0，小計不會變成 NaN", () => {
  assert.equal(toFiniteNumber("3"), 3);
  assert.equal(toFiniteNumber(undefined), 0);
  assert.equal(toFiniteNumber(null), 0);
  assert.equal(toFiniteNumber("abc"), 0);
  assert.equal(toFiniteNumber(Infinity), 0);
});

test("normalizeOrderDate 補零成 YYYY-MM-DD，認不出格式時原樣保留", () => {
  assert.equal(normalizeOrderDate("2026/8/5 13:20"), "2026-08-05");
  assert.equal(normalizeOrderDate("2026-08-05"), "2026-08-05");
  assert.equal(normalizeOrderDate("不明"), "不明");
  assert.equal(normalizeOrderDate(undefined), "");
});

test("groupBy 依 key 分組並保留第一次出現的順序", () => {
  const rows = [
    { no: "B", seq: 1 },
    { no: "A", seq: 2 },
    { no: "B", seq: 3 },
  ];
  const grouped = groupBy(rows, (row) => row.no);

  assert.deepEqual([...grouped.keys()], ["B", "A"]);
  assert.deepEqual(grouped.get("B")?.map((row) => row.seq), [1, 3]);
  assert.deepEqual(grouped.get("A")?.map((row) => row.seq), [2]);
});

test("groupBy 略過沒有 key 的列與非物件", () => {
  const rows = [{ no: "A" }, { no: "" }, { no: undefined }, null, undefined] as Array<{ no?: string } | null | undefined>;
  const grouped = groupBy(rows, (row) => row?.no);

  assert.deepEqual([...grouped.keys()], ["A"]);
  assert.equal(grouped.get("A")?.length, 1);
});

test("groupBy 收到非陣列時回傳空 Map，而不是丟例外", () => {
  assert.equal(groupBy(undefined as never, () => "A").size, 0);
});

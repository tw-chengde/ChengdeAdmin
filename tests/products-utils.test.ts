import assert from "node:assert/strict";
import { test } from "vitest";
import type { CreateProductInput } from "@/app/types/product";
import {
  isValidProductId,
  mapProductDbError,
  notFoundMessage,
  validateProductInput,
} from "@/app/utils/products";

/** 只想驗證某個欄位時，其餘欄位一律帶合法值。 */
function input(overrides: Partial<CreateProductInput> = {}): CreateProductInput {
  return {
    code: "CD-1001",
    name: "保溫瓶",
    stock: 1,
    cvsMergeLimit: 2,
    logisticsMergeLimit: 6,
    ...overrides,
  };
}

test("validateProductInput 接受合法輸入並去除前後空白", () => {
  const result = validateProductInput(input({ code: "  CD-1001 ", name: " 保溫瓶 ", stock: 5 }));
  assert.equal(result.ok, true);
  assert.deepEqual(result, {
    ok: true,
    code: "CD-1001",
    name: "保溫瓶",
    stock: 5,
    cvsMergeLimit: 2,
    logisticsMergeLimit: 6,
  });
});

test("validateProductInput 允許庫存為 0", () => {
  const result = validateProductInput(input({ stock: 0 }));
  assert.equal(result.ok, true);
});

test("validateProductInput 允許併單上限為 0（代表該通路不可併單）", () => {
  const result = validateProductInput(input({ cvsMergeLimit: 0, logisticsMergeLimit: 0 }));
  assert.deepEqual(result, {
    ok: true,
    code: "CD-1001",
    name: "保溫瓶",
    stock: 1,
    cvsMergeLimit: 0,
    logisticsMergeLimit: 0,
  });
});

test("validateProductInput 擋下空白的商品代號與名稱", () => {
  assert.deepEqual(validateProductInput(input({ code: "" })), {
    ok: false,
    error: "請輸入商品代號",
  });
  assert.deepEqual(validateProductInput(input({ code: "   " })), {
    ok: false,
    error: "請輸入商品代號",
  });
  assert.deepEqual(validateProductInput(input({ name: "  " })), {
    ok: false,
    error: "請輸入商品名稱",
  });
});

test.each([
  { field: "stock", label: "庫存" },
  { field: "cvsMergeLimit", label: "超商併單上限" },
  { field: "logisticsMergeLimit", label: "物流併單上限" },
] as const)("validateProductInput 擋下負數、小數與非數字的$label", ({ field, label }) => {
  const expected = { ok: false, error: `${label}必須為 0 或正整數` };
  for (const value of [-1, 1.5, "abc", NaN, undefined]) {
    assert.deepEqual(validateProductInput(input({ [field]: value as unknown as number })), expected, String(value));
  }
});

test("isValidProductId 只接受正整數", () => {
  assert.equal(isValidProductId(1), true);
  assert.equal(isValidProductId("3"), true);
  assert.equal(isValidProductId(0), false);
  assert.equal(isValidProductId(-1), false);
  assert.equal(isValidProductId(1.5), false);
  assert.equal(isValidProductId("abc"), false);
  assert.equal(isValidProductId(undefined), false);
  assert.equal(isValidProductId(null), false);
});

test("mapProductDbError 把 UNIQUE 衝突轉成商品代號已存在", () => {
  const message = "D1_ERROR: UNIQUE constraint failed: products.code";
  assert.equal(mapProductDbError(message, "create", "CD-1001"), "商品代號「CD-1001」已存在");
  assert.equal(mapProductDbError(message, "update", "CD-1001"), "商品代號「CD-1001」已存在");
});

test("mapProductDbError 對其他錯誤回傳不洩漏細節的通用訊息", () => {
  const raw = "D1_ERROR: no such table: products";
  assert.equal(mapProductDbError(raw, "create"), "新增失敗，請稍後再試");
  assert.equal(mapProductDbError(raw, "update"), "修改失敗，請稍後再試");
  assert.equal(mapProductDbError(raw, "delete"), "刪除失敗，請稍後再試");
});

test("mapProductDbError 沒有商品代號時不會產生殘缺的訊息", () => {
  // 刪除沒有 code 可帶入，即使撞到 UNIQUE 也應回傳通用訊息。
  const message = "UNIQUE constraint failed: products.code";
  assert.equal(mapProductDbError(message, "delete"), "刪除失敗，請稍後再試");
});

test("notFoundMessage 依動作回傳對應訊息", () => {
  assert.equal(notFoundMessage("update"), "找不到要修改的商品，可能已被刪除");
  assert.equal(notFoundMessage("delete"), "找不到要刪除的商品，可能已被刪除");
});

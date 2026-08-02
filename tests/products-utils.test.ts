import assert from "node:assert/strict";
import { test } from "vitest";
import {
  isValidProductId,
  mapProductDbError,
  notFoundMessage,
  validateProductInput,
} from "@/app/utils/products";

test("validateProductInput 接受合法輸入並去除前後空白", () => {
  const result = validateProductInput({ code: "  CD-1001 ", name: " 保溫瓶 ", stock: 5 });
  assert.equal(result.ok, true);
  assert.deepEqual(result, { ok: true, code: "CD-1001", name: "保溫瓶", stock: 5 });
});

test("validateProductInput 允許庫存為 0", () => {
  const result = validateProductInput({ code: "CD-1001", name: "保溫瓶", stock: 0 });
  assert.equal(result.ok, true);
});

test("validateProductInput 擋下空白的商品代號與名稱", () => {
  assert.deepEqual(validateProductInput({ code: "", name: "保溫瓶", stock: 1 }), {
    ok: false,
    error: "請輸入商品代號",
  });
  assert.deepEqual(validateProductInput({ code: "   ", name: "保溫瓶", stock: 1 }), {
    ok: false,
    error: "請輸入商品代號",
  });
  assert.deepEqual(validateProductInput({ code: "CD-1001", name: "  ", stock: 1 }), {
    ok: false,
    error: "請輸入商品名稱",
  });
});

test("validateProductInput 擋下負數、小數與非數字的庫存", () => {
  const expected = { ok: false, error: "庫存必須為 0 或正整數" };
  assert.deepEqual(validateProductInput({ code: "CD-1001", name: "保溫瓶", stock: -1 }), expected);
  assert.deepEqual(validateProductInput({ code: "CD-1001", name: "保溫瓶", stock: 1.5 }), expected);
  assert.deepEqual(
    validateProductInput({ code: "CD-1001", name: "保溫瓶", stock: "abc" as unknown as number }),
    expected,
  );
  assert.deepEqual(
    validateProductInput({ code: "CD-1001", name: "保溫瓶", stock: NaN }),
    expected,
  );
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

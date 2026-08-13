import assert from "node:assert/strict";
import { test } from "vitest";
import type { PlatformProduct } from "@/app/lib/platforms/product";
import type { Product } from "@/app/types/product";
import type { ProductBinding } from "@/app/types/product-binding";
import {
  bindingKey,
  bindingStats,
  filterPlatformProducts,
  indexBindings,
  mapBindingDbError,
  suggestProductId,
  validateBindInput,
} from "@/app/utils/product-bindings";

/** 只想驗證某個欄位時，其餘欄位一律帶合法值。 */
function platformProduct(overrides: Partial<PlatformProduct> = {}): PlatformProduct {
  return {
    id: "MOMO_MAIN:1000000",
    platformCode: "MOMO_MAIN",
    goodsCode: "1000000",
    name: "誠得保溫瓶 750ml",
    entpGoodsNo: "CD-1001",
    salePrice: 1280,
    listingStatus: "LISTED",
    skuCount: 2,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    code: "CD-1001",
    name: "誠得保溫瓶",
    stock: 10,
    cvs_merge_limit: 2,
    logistics_merge_limit: 6,
    created_at: "2026-08-01 10:00:00",
    ...overrides,
  };
}

function binding(overrides: Partial<ProductBinding> = {}): ProductBinding {
  return {
    id: 1,
    product_id: 1,
    platform_code: "MOMO_MAIN",
    goods_code: "1000000",
    goods_name: "誠得保溫瓶 750ml",
    created_at: "2026-08-01 10:00:00",
    ...overrides,
  };
}

const bottle = platformProduct();
const lamp = platformProduct({
  id: "MOMO_MAIN:1000001",
  goodsCode: "1000001",
  name: "護眼檯燈",
  entpGoodsNo: null,
});
const moStoreChair = platformProduct({
  id: "MO_STORE_PLUS:22222",
  platformCode: "MO_STORE_PLUS",
  goodsCode: "22222",
  name: "辦公椅",
  entpGoodsNo: "CD-2001",
});
const all = [bottle, lamp, moStoreChair];
const boundBottle = indexBindings([binding()]);

test("篩選只回傳目前分頁平台的商品", () => {
  const result = filterPlatformProducts(all, { platformCode: "MO_STORE_PLUS", keyword: "", filter: "ALL" }, new Map());
  assert.deepEqual(result, [moStoreChair]);
});

test("關鍵字可比對平台商品編號、商品名稱與原廠編號，且不分大小寫", () => {
  const criteria = { platformCode: "MOMO_MAIN", filter: "ALL" as const };
  assert.deepEqual(filterPlatformProducts(all, { ...criteria, keyword: "1000001" }, new Map()), [lamp]);
  assert.deepEqual(filterPlatformProducts(all, { ...criteria, keyword: "檯燈" }, new Map()), [lamp]);
  assert.deepEqual(filterPlatformProducts(all, { ...criteria, keyword: "cd-1001" }, new Map()), [bottle]);
  assert.deepEqual(filterPlatformProducts(all, { ...criteria, keyword: "  " }, new Map()), [bottle, lamp]);
});

test("綁定狀態篩選分別回傳已綁定與未綁定的商品", () => {
  const criteria = { platformCode: "MOMO_MAIN", keyword: "" };
  assert.deepEqual(filterPlatformProducts(all, { ...criteria, filter: "BOUND" }, boundBottle), [bottle]);
  assert.deepEqual(filterPlatformProducts(all, { ...criteria, filter: "UNBOUND" }, boundBottle), [lamp]);
  assert.deepEqual(filterPlatformProducts(all, { ...criteria, filter: "ALL" }, boundBottle), [bottle, lamp]);
});

test("統計只計算傳入的商品，並區分已綁定與未綁定", () => {
  assert.deepEqual(bindingStats([bottle, lamp], boundBottle), { total: 2, bound: 1, unbound: 1 });
  assert.deepEqual(bindingStats([], boundBottle), { total: 0, bound: 0, unbound: 0 });
});

test("綁定索引以平台代碼加商品編號為鍵，不同平台的相同編號不會互相覆蓋", () => {
  const index = indexBindings([binding(), binding({ id: 2, platform_code: "MO_STORE_PLUS", product_id: 3 })]);
  assert.equal(index.size, 2);
  assert.equal(index.get(bindingKey("MOMO_MAIN", "1000000"))?.product_id, 1);
  assert.equal(index.get(bindingKey("MO_STORE_PLUS", "1000000"))?.product_id, 3);
});

test("自動配對以原廠編號優先比對本地商品代號，去空白且不分大小寫", () => {
  const products = [product({ id: 7, code: " cd-1001 " }), product({ id: 8, code: "CD-2001" })];
  assert.equal(suggestProductId(bottle, products), 7);
  assert.equal(suggestProductId(moStoreChair, products), 8);
});

test("原廠編號缺漏時改以平台商品編號比對，仍找不到則回傳 null", () => {
  const byGoodsCode = platformProduct({ entpGoodsNo: null, goodsCode: "CD-9001" });
  assert.equal(suggestProductId(byGoodsCode, [product({ id: 9, code: "CD-9001" })]), 9);
  assert.equal(suggestProductId(lamp, [product({ id: 7, code: "CD-1001" })]), null);
});

test("綁定輸入驗證會整理值並擋掉缺漏欄位", () => {
  assert.deepEqual(validateBindInput({ productId: 3, platformCode: "MOMO_MAIN", goodsCode: " 1000000 ", goodsName: " 保溫瓶 " }), {
    ok: true,
    productId: 3,
    platformCode: "MOMO_MAIN",
    goodsCode: "1000000",
    goodsName: "保溫瓶",
  });
  assert.deepEqual(validateBindInput({ productId: 0, platformCode: "MOMO_MAIN", goodsCode: "1000000" }), {
    ok: false,
    error: "請選擇要綁定的本地商品",
  });
  assert.deepEqual(validateBindInput({ productId: 3, platformCode: "MOMO_MAIN", goodsCode: "   " }), {
    ok: false,
    error: "缺少平台商品編號",
  });
});

test("資料庫錯誤轉成中文訊息，外鍵失敗另有專屬說明", () => {
  assert.equal(mapBindingDbError("FOREIGN KEY constraint failed", "bind"), "找不到要綁定的本地商品，可能已被刪除");
  assert.equal(mapBindingDbError("D1_ERROR: something internal", "bind"), "綁定失敗，請稍後再試");
  assert.equal(mapBindingDbError("D1_ERROR: something internal", "unbind"), "解除綁定失敗，請稍後再試");
});

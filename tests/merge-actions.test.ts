import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PlatformConnector } from "@/app/lib/platforms/connector";
import { momoDefinition } from "@/app/lib/platforms/definitions";

const getDb = vi.fn();
const getEnabledConnectors = vi.fn();
const listEnabledPlatformCodes = vi.fn();
const listProducts = vi.fn();

vi.mock("@/app/lib/db", () => ({
  getDb: () => getDb(),
}));
vi.mock("@/app/lib/platforms/registry", () => ({
  getEnabledConnectors: (...args: unknown[]) => getEnabledConnectors(...args),
}));
vi.mock("@/app/dashboard/platforms-actions", () => ({
  listEnabledPlatformCodes: () => listEnabledPlatformCodes(),
}));
vi.mock("@/app/dashboard/products-actions", () => ({
  listProducts: () => listProducts(),
}));

const { bindPlatformProduct, loadMergeBindingPageData, unbindPlatformProduct } = await import("@/app/dashboard/merge-actions");

beforeEach(() => {
  vi.clearAllMocks();
  listEnabledPlatformCodes.mockResolvedValue(["MOMO_MAIN"]);
  listProducts.mockResolvedValue([{ id: 1, code: "CD-1" }]);
  getDb.mockReturnValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([{ id: 3, product_id: 1, platform_code: "MOMO_MAIN", goods_code: "P-1" }]),
      }),
    }),
  });
});

test("loadMergeBindingPageData combines local records with products fetched from the selected enabled platform", async () => {
  const fetchProducts = vi.fn().mockResolvedValue([{ code: "P-1", name: "Platform product" }]);
  getEnabledConnectors.mockReturnValue([{ definition: momoDefinition, fetchProducts } satisfies Partial<PlatformConnector>]);

  const result = await loadMergeBindingPageData({ platformCode: "MOMO_MAIN", listingStatus: "ALL" });

  assert.deepEqual(result.platformProducts, [{ code: "P-1", name: "Platform product" }]);
  assert.deepEqual(result.bindings, [{ id: 3, product_id: 1, platform_code: "MOMO_MAIN", goods_code: "P-1" }]);
  assert.deepEqual(result.products, [{ id: 1, code: "CD-1" }]);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(fetchProducts.mock.calls[0][0], { platformCode: "MOMO_MAIN", listingStatus: "ALL" });
});

test("loadMergeBindingPageData reports connector failures and does not fetch a disabled platform", async () => {
  const fetchProducts = vi.fn().mockRejectedValue(new Error("platform unavailable"));
  getEnabledConnectors.mockReturnValue([{ definition: momoDefinition, fetchProducts }]);

  const failed = await loadMergeBindingPageData({ platformCode: "MOMO_MAIN", listingStatus: "ALL" });
  assert.deepEqual(failed.platformProducts, []);
  assert.deepEqual(failed.failures, [{ platformCode: "MOMO_MAIN", message: "platform unavailable" }]);

  const disabled = await loadMergeBindingPageData({ platformCode: "MO_STORE_PLUS", listingStatus: "ALL" });
  assert.deepEqual(disabled.platformProducts, []);
  assert.deepEqual(disabled.failures, []);
  assert.equal(fetchProducts.mock.calls.length, 1);
});

test("bindPlatformProduct validates input, upserts valid bindings, and maps database errors", async () => {
  assert.equal((await bindPlatformProduct({ productId: 0, platformCode: "MOMO_MAIN", goodsCode: "P-1", goodsName: "Product" })).ok, false);
  assert.equal(getDb.mock.calls.length, 0);

  const values = vi.fn().mockReturnValue({
    onConflictDoUpdate: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) }),
  });
  getDb.mockReturnValue({ insert: vi.fn().mockReturnValue({ values }) });

  assert.deepEqual(await bindPlatformProduct({ productId: 1, platformCode: "MOMO_MAIN", goodsCode: " P-1 ", goodsName: " Product " }), { ok: true });
  assert.deepEqual(values.mock.calls[0][0], { productId: 1, platformCode: "MOMO_MAIN", goodsCode: "P-1", goodsName: "Product" });

  getDb.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockReturnValue({ run: vi.fn().mockRejectedValue("write failed") }) }),
    }),
  });
  assert.equal((await bindPlatformProduct({ productId: 1, platformCode: "MOMO_MAIN", goodsCode: "P-1", goodsName: "Product" })).ok, false);
});

test("unbindPlatformProduct rejects invalid and missing bindings and maps database errors", async () => {
  assert.equal((await unbindPlatformProduct("MOMO_MAIN", " ")).ok, false);

  getDb.mockReturnValue({
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }) }) }),
  });
  assert.equal((await unbindPlatformProduct("MOMO_MAIN", "P-1")).ok, false);

  getDb.mockReturnValue({
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }) }) }),
  });
  assert.deepEqual(await unbindPlatformProduct("MOMO_MAIN", " P-1 "), { ok: true });

  getDb.mockReturnValue({
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ run: vi.fn().mockRejectedValue(new Error("write failed")) }) }),
  });
  assert.equal((await unbindPlatformProduct("MOMO_MAIN", "P-1")).ok, false);
});

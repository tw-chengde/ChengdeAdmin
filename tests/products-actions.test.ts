import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const getDb = vi.fn();

vi.mock("@/app/lib/db", () => ({
  getDb: () => getDb(),
}));

const { createProduct, deleteProduct, listProducts, updateProduct } = await import("@/app/dashboard/products-actions");

const productInput = {
  code: "CD-1001",
  name: "Test product",
  stock: 3,
  cvsMergeLimit: 2,
  logisticsMergeLimit: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("listProducts returns products ordered by the action query", async () => {
  const rows = [{ id: 1, ...productInput, created_at: "2026-08-12" }];
  const orderBy = vi.fn().mockResolvedValue(rows);
  getDb.mockReturnValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ orderBy }),
    }),
  });

  assert.deepEqual(await listProducts(), rows);
  assert.equal(orderBy.mock.calls.length, 1);
});

test("createProduct validates input before opening a database mutation", async () => {
  assert.equal((await createProduct({ ...productInput, code: " " })).ok, false);
  assert.equal(getDb.mock.calls.length, 0);
});

test("createProduct stores validated values and maps unique conflicts", async () => {
  const values = vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) });
  getDb.mockReturnValue({ insert: vi.fn().mockReturnValue({ values }) });

  assert.deepEqual(await createProduct(productInput), { ok: true });
  assert.deepEqual(values.mock.calls[0][0], productInput);

  getDb.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ run: vi.fn().mockRejectedValue(new Error("UNIQUE constraint failed: products.code")) }),
    }),
  });
  const result = await createProduct(productInput);
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /CD-1001/);
});

test("updateProduct and deleteProduct report invalid and missing records", async () => {
  assert.equal((await updateProduct({ ...productInput, id: 0 })).ok, false);
  assert.equal((await deleteProduct(0)).ok, false);

  getDb.mockReturnValue({
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }) }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }) }),
    }),
  });

  assert.equal((await updateProduct({ ...productInput, id: 99 })).ok, false);
  assert.equal((await deleteProduct(99)).ok, false);
});
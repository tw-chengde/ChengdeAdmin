import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { Product } from "@/app/types/product";

// server actions 會呼叫 D1，測試時整個模組換成 spy。
const listProducts = vi.fn();
const createProduct = vi.fn();
const updateProduct = vi.fn();
const deleteProduct = vi.fn();

vi.mock("@/app/dashboard/products-actions", () => ({
  listProducts: () => listProducts(),
  createProduct: (input: unknown) => createProduct(input),
  updateProduct: (input: unknown) => updateProduct(input),
  deleteProduct: (id: number) => deleteProduct(id),
}));

const { default: ProductsView } = await import("@/app/dashboard/products-view");

const bottle: Product = {
  id: 1,
  code: "CD-1001",
  name: "誠得尊榮保溫瓶 750ml",
  stock: 12,
  cvs_merge_limit: 2,
  logistics_merge_limit: 6,
  created_at: "2026-08-01 10:00:00",
};
const beans: Product = {
  id: 2,
  code: "CD-2002",
  name: "有機咖啡豆",
  stock: 0,
  cvs_merge_limit: 0,
  logistics_merge_limit: 12,
  created_at: "2026-08-01 09:00:00",
};

beforeEach(() => {
  vi.clearAllMocks();
  listProducts.mockResolvedValue([bottle, beans]);
  createProduct.mockResolvedValue({ ok: true });
  updateProduct.mockResolvedValue({ ok: true });
  deleteProduct.mockResolvedValue({ ok: true });
});

/** 等待初始載入完成，回傳操作用的 user event。 */
async function renderProducts() {
  const user = userEvent.setup();
  render(<ProductsView />);
  await screen.findByText(bottle.name);
  return user;
}

/** 取得某個商品所在列的「修改」或「刪除」按鈕。 */
async function clickRowAction(user: ReturnType<typeof userEvent.setup>, product: Product, action: "修改商品" | "刪除商品") {
  const row = screen.getByText(product.name).closest("tr");
  assert.ok(row, "找不到商品所在的列");
  await user.click(within(row).getByRole("button", { name: action }));
}

/** 清空欄位後輸入新值。 */
async function fill(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, value: string) {
  await user.clear(field);
  await user.type(field, value);
}

test("載入後顯示商品清單與每列的修改、刪除按鈕", async () => {
  await renderProducts();

  assert.ok(screen.getByText(bottle.code));
  assert.ok(screen.getByText(beans.name));
  assert.equal(screen.getAllByRole("button", { name: "修改商品" }).length, 2);
  assert.equal(screen.getAllByRole("button", { name: "刪除商品" }).length, 2);
});

test("清單依超商與物流分別顯示併單上限，0 顯示為不可併單", async () => {
  await renderProducts();

  const bottleRow = screen.getByText(bottle.name).closest("tr");
  assert.ok(bottleRow);
  assert.ok(within(bottleRow).getByText("超商 上限 2 件"), "超商上限");
  assert.ok(within(bottleRow).getByText("物流 上限 6 件"), "物流上限");

  const beansRow = screen.getByText(beans.name).closest("tr");
  assert.ok(beansRow);
  assert.ok(within(beansRow).getByText("超商 不可併單"), "超商上限為 0");
  assert.ok(within(beansRow).getByText("物流 上限 12 件"), "物流上限");
});

test("新增商品在對話框中進行，送出後帶著併單上限呼叫 createProduct", async () => {
  const user = await renderProducts();
  assert.equal(screen.queryAllByRole("dialog").length, 0, "預設不應開著對話框");

  await user.click(screen.getByRole("button", { name: "新增商品" }));

  const dialog = await screen.findByRole("dialog");
  await fill(user, within(dialog).getByLabelText(/商品代號/), "CD-3003");
  await fill(user, within(dialog).getByLabelText(/商品名稱/), "隔熱杯組");
  await fill(user, within(dialog).getByLabelText(/庫存/), "8");
  await fill(user, within(dialog).getByLabelText(/超商併單上限/), "4");
  await fill(user, within(dialog).getByLabelText(/物流併單上限/), "10");

  await user.click(within(dialog).getByRole("button", { name: "確定新增" }));

  await waitFor(() => assert.equal(createProduct.mock.calls.length, 1));
  assert.deepEqual(createProduct.mock.calls[0][0], {
    code: "CD-3003",
    name: "隔熱杯組",
    stock: 8,
    cvsMergeLimit: 4,
    logisticsMergeLimit: 10,
  });

  // 成功後關閉對話框、顯示成功訊息，並重新抓一次清單。
  await waitFor(() => assert.equal(screen.queryAllByRole("dialog").length, 0));
  assert.ok(screen.getByText("商品已新增"));
  assert.equal(listProducts.mock.calls.length, 2);
});

test("新增失敗時錯誤留在對話框內且不關閉", async () => {
  createProduct.mockResolvedValue({ ok: false, error: "商品代號「CD-1001」已存在" });
  const user = await renderProducts();
  await user.click(screen.getByRole("button", { name: "新增商品" }));

  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText(/商品代號/), "CD-1001");
  await user.type(within(dialog).getByLabelText(/商品名稱/), "保溫瓶");
  await user.click(within(dialog).getByRole("button", { name: "確定新增" }));

  assert.ok(await within(dialog).findByText("商品代號「CD-1001」已存在"));
  assert.ok(screen.getByRole("dialog"), "失敗時對話框應保持開啟");
  assert.equal(listProducts.mock.calls.length, 1, "失敗時不應重新載入");
});

test("取消新增不會呼叫 createProduct", async () => {
  const user = await renderProducts();
  await user.click(screen.getByRole("button", { name: "新增商品" }));

  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "取消" }));

  await waitFor(() => assert.equal(screen.queryAllByRole("dialog").length, 0));
  assert.equal(createProduct.mock.calls.length, 0);
});

test("點擊修改會開啟對話框並預先填入該商品現值（含併單上限）", async () => {
  const user = await renderProducts();
  await clickRowAction(user, bottle, "修改商品");

  const dialog = await screen.findByRole("dialog");
  assert.equal(within(dialog).getByLabelText(/商品代號/).getAttribute("value"), bottle.code);
  assert.equal(within(dialog).getByLabelText(/商品名稱/).getAttribute("value"), bottle.name);
  assert.equal(within(dialog).getByLabelText(/庫存/).getAttribute("value"), String(bottle.stock));
  assert.equal(
    within(dialog).getByLabelText(/超商併單上限/).getAttribute("value"),
    String(bottle.cvs_merge_limit),
  );
  assert.equal(
    within(dialog).getByLabelText(/物流併單上限/).getAttribute("value"),
    String(bottle.logistics_merge_limit),
  );
});

test("儲存變更會帶著商品 id 與新值呼叫 updateProduct，並重新載入清單", async () => {
  const user = await renderProducts();
  await clickRowAction(user, bottle, "修改商品");

  const dialog = await screen.findByRole("dialog");
  await fill(user, within(dialog).getByLabelText(/商品名稱/), "新名稱");
  await fill(user, within(dialog).getByLabelText(/庫存/), "30");
  await fill(user, within(dialog).getByLabelText(/超商併單上限/), "0");
  await fill(user, within(dialog).getByLabelText(/物流併單上限/), "8");

  await user.click(within(dialog).getByRole("button", { name: "儲存變更" }));

  await waitFor(() => assert.equal(updateProduct.mock.calls.length, 1));
  assert.deepEqual(updateProduct.mock.calls[0][0], {
    id: bottle.id,
    code: bottle.code,
    name: "新名稱",
    stock: 30,
    cvsMergeLimit: 0,
    logisticsMergeLimit: 8,
  });

  // 成功後關閉對話框、顯示成功訊息，並重新抓一次清單。
  await waitFor(() => assert.equal(screen.queryAllByRole("dialog").length, 0));
  assert.ok(screen.getByText("商品已更新"));
  assert.equal(listProducts.mock.calls.length, 2);
});

test("修改失敗時錯誤留在對話框內且不關閉", async () => {
  updateProduct.mockResolvedValue({ ok: false, error: "商品代號「CD-2002」已存在" });
  const user = await renderProducts();
  await clickRowAction(user, bottle, "修改商品");

  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "儲存變更" }));

  assert.ok(await within(dialog).findByText("商品代號「CD-2002」已存在"));
  assert.ok(screen.getByRole("dialog"), "失敗時對話框應保持開啟");
  assert.equal(listProducts.mock.calls.length, 1, "失敗時不應重新載入");
});

test("取消修改不會呼叫 updateProduct", async () => {
  const user = await renderProducts();
  await clickRowAction(user, bottle, "修改商品");

  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "取消" }));

  await waitFor(() => assert.equal(screen.queryAllByRole("dialog").length, 0));
  assert.equal(updateProduct.mock.calls.length, 0);
});

test("刪除需先確認，確認後帶著該商品 id 呼叫 deleteProduct", async () => {
  const user = await renderProducts();
  await clickRowAction(user, beans, "刪除商品");

  const dialog = await screen.findByRole("dialog");
  // 確認對話框需顯示要刪除的是哪一筆，避免誤刪。
  assert.ok(within(dialog).getByText(new RegExp(beans.name)));
  assert.equal(deleteProduct.mock.calls.length, 0, "尚未確認前不應刪除");

  await user.click(within(dialog).getByRole("button", { name: "確定刪除" }));

  await waitFor(() => assert.equal(deleteProduct.mock.calls.length, 1));
  assert.deepEqual(deleteProduct.mock.calls[0], [beans.id]);
  await waitFor(() => assert.equal(screen.queryAllByRole("dialog").length, 0));
  assert.ok(screen.getByText(`商品「${beans.name}」已刪除`));
  assert.equal(listProducts.mock.calls.length, 2);
});

test("取消刪除不會呼叫 deleteProduct", async () => {
  const user = await renderProducts();
  await clickRowAction(user, beans, "刪除商品");

  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "取消" }));

  await waitFor(() => assert.equal(screen.queryAllByRole("dialog").length, 0));
  assert.equal(deleteProduct.mock.calls.length, 0);
});

test("刪除失敗時錯誤留在對話框內且不關閉", async () => {
  deleteProduct.mockResolvedValue({ ok: false, error: "找不到要刪除的商品，可能已被刪除" });
  const user = await renderProducts();
  await clickRowAction(user, beans, "刪除商品");

  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "確定刪除" }));

  assert.ok(await within(dialog).findByText("找不到要刪除的商品，可能已被刪除"));
  assert.ok(screen.getByRole("dialog"));
  assert.equal(listProducts.mock.calls.length, 1);
});

test("載入清單失敗時顯示錯誤訊息", async () => {
  listProducts.mockRejectedValue(new Error("找不到 D1 binding 'DB'"));
  render(<ProductsView />);

  assert.ok(await screen.findByText("找不到 D1 binding 'DB'"));
});

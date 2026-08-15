import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { PlatformSettingsProvider } from "@/app/dashboard/platform-settings-context";
import type { PlatformProduct } from "@/app/lib/platforms/product";
import type { PlatformStatus } from "@/app/types/platform";
import type { Product } from "@/app/types/product";
import type { MergeBindingPageData, ProductBinding } from "@/app/types/product-binding";

// server actions 會呼叫 D1 與平台 API，測試時整個模組換成 spy。
const listPlatformStatuses = vi.fn();
const loadMergeBindingPageData = vi.fn();
const bindPlatformProduct = vi.fn();
const unbindPlatformProduct = vi.fn();

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listPlatformStatuses: () => listPlatformStatuses(),
}));

vi.mock("@/app/dashboard/merge-actions", () => ({
  loadMergeBindingPageData: (query: unknown) => loadMergeBindingPageData(query),
  bindPlatformProduct: (input: unknown) => bindPlatformProduct(input),
  unbindPlatformProduct: (platformCode: string, goodsCode: string) => unbindPlatformProduct(platformCode, goodsCode),
}));

const { default: MergeBindingsView } = await import("@/app/dashboard/merge-bindings-view");

const momoStatus: PlatformStatus = { code: "MOMO_MAIN", name: "MOMO 購物網", logo: "/images/momo.png", enabled: true };
const moStorePlusStatus: PlatformStatus = { code: "MO_STORE_PLUS", name: "Mo 店+", logo: "/images/mo-store.jpg", enabled: true };

const bottle: PlatformProduct = {
  id: "MOMO_MAIN:1000000",
  platformCode: "MOMO_MAIN",
  goodsCode: "1000000",
  name: "誠得保溫瓶 750ml",
  entpGoodsNo: "CD-1001",
  salePrice: 1280,
  listingStatus: "LISTED",
  skuCount: 2,
};
const lamp: PlatformProduct = {
  id: "MOMO_MAIN:1000001",
  platformCode: "MOMO_MAIN",
  goodsCode: "1000001",
  name: "護眼檯燈",
  entpGoodsNo: null,
  salePrice: 2480,
  listingStatus: "LISTED",
  skuCount: 1,
};
const chair: PlatformProduct = {
  id: "MO_STORE_PLUS:22222",
  platformCode: "MO_STORE_PLUS",
  goodsCode: "22222",
  name: "人體工學辦公椅",
  entpGoodsNo: "CD-2002",
  salePrice: 6800,
  listingStatus: "LISTED",
  skuCount: 1,
};

const localBottle: Product = {
  id: 1,
  code: "CD-1001",
  name: "誠得保溫瓶",
  stock: 12,
  cvs_merge_limit: 2,
  logistics_merge_limit: 6,
  created_at: "2026-08-01 10:00:00",
};
const localChair: Product = {
  id: 2,
  code: "CD-2002",
  name: "辦公椅",
  stock: 4,
  cvs_merge_limit: 0,
  logistics_merge_limit: 1,
  created_at: "2026-08-01 09:00:00",
};

const bottleBinding: ProductBinding = {
  id: 1,
  product_id: localBottle.id,
  platform_code: "MOMO_MAIN",
  goods_code: bottle.goodsCode,
  goods_name: bottle.name,
  created_at: "2026-08-02 10:00:00",
};

function pageData(overrides: Partial<MergeBindingPageData> = {}): MergeBindingPageData {
  return {
    platformProducts: [bottle, lamp, chair],
    failures: [],
    bindings: [bottleBinding],
    products: [localBottle, localChair],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  listPlatformStatuses.mockResolvedValue([momoStatus, moStorePlusStatus]);
  loadMergeBindingPageData.mockResolvedValue(pageData());
  bindPlatformProduct.mockResolvedValue({ ok: true });
  unbindPlatformProduct.mockResolvedValue({ ok: true });
});

/** 掛載畫面，不觸發查詢。回傳操作用的 user event。 */
function mountView() {
  const user = userEvent.setup();
  render(
    <PlatformSettingsProvider>
      <MergeBindingsView />
    </PlatformSettingsProvider>,
  );
  return user;
}

/** 掛載後按下「查詢」並等待結果，回傳操作用的 user event。 */
async function renderView() {
  const user = mountView();
  await user.click(await screen.findByRole("button", { name: "查詢" }));
  await screen.findByText(bottle.name);
  return user;
}

/** 取得某個平台商品所在列的操作按鈕。 */
function rowButton(name: string, action: "綁定" | "變更綁定" | "解除綁定") {
  const row = screen.getByText(name).closest("tr");
  assert.ok(row, "找不到平台商品所在的列");
  return within(row).getByRole("button", { name: action });
}

test("進入畫面不自動查詢，顯示提示且沒有重新整理按鈕", async () => {
  mountView();

  assert.ok(await screen.findByText("請選擇查詢條件後按下「查詢」。"));
  assert.equal(loadMergeBindingPageData.mock.calls.length, 0);
  assert.equal(screen.queryByRole("button", { name: "重新整理" }), null);
});

// 「預設條件為 MOMO_MAIN + LISTED」與「切換平台時保留各平台已查到的結果」
// 由 useMergeBindings.test.ts 在 hook 層驗證，這裡只留 DOM 才看得出來的行為。
test("切換商品狀態後查詢會送出對應的條件", async () => {
  const user = mountView();

  await user.click(await screen.findByRole("combobox", { name: "商品狀態" }));
  await user.click(await screen.findByRole("option", { name: "已下架" }));
  await user.click(screen.getByRole("button", { name: "查詢" }));

  await screen.findByText(bottle.name);
  assert.deepEqual(loadMergeBindingPageData.mock.calls[0][0], {
    platformCode: "MOMO_MAIN",
    listingStatus: "DELISTED",
  });

  await user.click(screen.getByRole("combobox", { name: "商品狀態" }));
  await user.click(await screen.findByRole("option", { name: "全部" }));
  await user.click(screen.getByRole("button", { name: "查詢" }));

  assert.deepEqual(loadMergeBindingPageData.mock.calls[1][0], {
    platformCode: "MOMO_MAIN",
    listingStatus: "ALL",
  });
});

test("改了商品狀態但未按查詢時，綁定後的重載仍沿用上次送出的條件", async () => {
  const user = await renderView();

  // 先把下拉改成「已下架」但不按查詢，再完成一次綁定。
  await user.click(screen.getByRole("combobox", { name: "商品狀態" }));
  await user.click(await screen.findByRole("option", { name: "已下架" }));

  await user.click(rowButton(lamp.name, "綁定"));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("combobox", { name: /本地商品/ }));
  await user.click(await screen.findByText(`${localChair.code} · ${localChair.name}`));
  await user.click(within(dialog).getByRole("button", { name: "確定綁定" }));

  await screen.findByText(/已將「護眼檯燈」綁定至/);
  assert.deepEqual(loadMergeBindingPageData.mock.calls[1][0], {
    platformCode: "MOMO_MAIN",
    listingStatus: "LISTED",
  });
});

test("表格內以中文顯示平台商品的上下架狀態", async () => {
  loadMergeBindingPageData.mockResolvedValue(
    pageData({ platformProducts: [bottle, { ...lamp, listingStatus: "DELISTED" }] }),
  );
  await renderView();

  const listedRow = screen.getByText(bottle.name).closest("tr");
  assert.ok(listedRow);
  assert.ok(within(listedRow).getByText("上架中"));

  const delistedRow = screen.getByText(lamp.name).closest("tr");
  assert.ok(delistedRow);
  assert.ok(within(delistedRow).getByText("已下架"));
});

test("預設顯示第一個啟用平台的商品，其他平台的商品不出現在清單中", async () => {
  await renderView();

  assert.ok(screen.getByRole("tab", { name: /MOMO 購物網/ }));
  assert.ok(screen.getByRole("tab", { name: /Mo 店\+/ }));
  assert.ok(screen.getByText(lamp.name));
  assert.equal(screen.queryByText(chair.name), null);
});

test("已綁定的列顯示本地商品與併單上限，未綁定的列顯示未綁定", async () => {
  await renderView();

  const boundRow = screen.getByText(bottle.name).closest("tr");
  assert.ok(boundRow);
  assert.ok(within(boundRow).getByText(`${localBottle.code} · ${localBottle.name}`));
  assert.ok(within(boundRow).getByText("超商 上限 2 件"));
  assert.ok(within(boundRow).getByText("物流 上限 6 件"));

  const unboundRow = screen.getByText(lamp.name).closest("tr");
  assert.ok(unboundRow);
  assert.ok(within(unboundRow).getByText("未綁定"));
});

test("切換到沒查過的平台分頁不自動查詢，查詢時只送出新平台", async () => {
  const user = await renderView();

  await user.click(screen.getByRole("tab", { name: /Mo 店\+/ }));

  // 切分頁不自動打 API，沒查過的平台顯示未查詢提示。
  assert.ok(await screen.findByText("請選擇查詢條件後按下「查詢」。"));
  assert.equal(screen.queryByText(bottle.name), null);
  assert.equal(loadMergeBindingPageData.mock.calls.length, 1);

  loadMergeBindingPageData.mockResolvedValue(pageData({ platformProducts: [chair], bindings: [] }));
  await user.click(screen.getByRole("button", { name: "查詢" }));

  assert.ok(await screen.findByText(chair.name));
  assert.deepEqual(loadMergeBindingPageData.mock.calls[1][0], {
    platformCode: "MO_STORE_PLUS",
    listingStatus: "LISTED",
  });
});

test("改了商品狀態還沒按查詢時提示目前顯示的是舊條件的結果", async () => {
  const user = await renderView();

  assert.equal(screen.queryByText(/目前顯示的是/), null);

  await user.click(screen.getByRole("combobox", { name: "商品狀態" }));
  await user.click(await screen.findByRole("option", { name: "已下架" }));
  assert.ok(await screen.findByText("目前顯示的是「上架中」的查詢結果，按下「查詢」以套用新條件。"));

  await user.click(screen.getByRole("button", { name: "查詢" }));
  await screen.findByText(bottle.name);
  assert.equal(screen.queryByText(/目前顯示的是/), null);
});

test("綁定成功後送出正確的輸入並重新載入資料", async () => {
  const user = await renderView();

  await user.click(rowButton(lamp.name, "綁定"));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("combobox", { name: /本地商品/ }));
  await user.click(await screen.findByText(`${localChair.code} · ${localChair.name}`));
  await user.click(within(dialog).getByRole("button", { name: "確定綁定" }));

  await screen.findByText(/已將「護眼檯燈」綁定至/);
  assert.deepEqual(bindPlatformProduct.mock.calls[0][0], {
    productId: localChair.id,
    platformCode: "MOMO_MAIN",
    goodsCode: lamp.goodsCode,
    goodsName: lamp.name,
  });
  assert.equal(loadMergeBindingPageData.mock.calls.length, 2);
});

test("開啟綁定對話框時以原廠編號自動預選對應的本地商品", async () => {
  const user = await renderView();
  await user.click(screen.getByRole("tab", { name: /Mo 店\+/ }));
  await user.click(screen.getByRole("button", { name: "查詢" }));
  await screen.findByText(chair.name);

  await user.click(rowButton(chair.name, "綁定"));

  const dialog = await screen.findByRole("dialog");
  const input = within(dialog).getByRole("combobox", { name: /本地商品/ }) as HTMLInputElement;
  assert.equal(input.value, `${localChair.code} · ${localChair.name}`);
});

test("綁定失敗時錯誤訊息留在對話框內，且不重新載入", async () => {
  bindPlatformProduct.mockResolvedValue({ ok: false, error: "找不到要綁定的本地商品，可能已被刪除" });
  const user = await renderView();

  await user.click(rowButton(bottle.name, "變更綁定"));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "確定綁定" }));

  assert.ok(await within(dialog).findByText("找不到要綁定的本地商品，可能已被刪除"));
  assert.ok(screen.getByRole("dialog"));
  assert.equal(loadMergeBindingPageData.mock.calls.length, 1);
});

test("解除綁定會帶入平台代碼與商品編號", async () => {
  const user = await renderView();

  await user.click(rowButton(bottle.name, "解除綁定"));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "確定解除" }));

  await screen.findByText(/已解除「誠得保溫瓶 750ml」的綁定/);
  assert.deepEqual(unbindPlatformProduct.mock.calls[0], ["MOMO_MAIN", bottle.goodsCode]);
});

test("篩選未綁定時只留下尚未對應本地商品的列", async () => {
  const user = await renderView();

  await user.click(screen.getByRole("combobox", { name: "綁定狀態" }));
  await user.click(await screen.findByRole("option", { name: "未綁定" }));

  assert.ok(screen.getByText(lamp.name));
  assert.equal(screen.queryByText(bottle.name), null);
});

test("關鍵字可搜尋平台商品編號", async () => {
  const user = await renderView();

  await user.type(screen.getByRole("textbox", { name: "搜尋平台商品" }), lamp.goodsCode);

  assert.ok(screen.getByText(lamp.name));
  assert.equal(screen.queryByText(bottle.name), null);
});

test("單一平台查詢失敗時顯示該分頁的警告，其他平台仍正常列出商品", async () => {
  loadMergeBindingPageData.mockResolvedValue(
    pageData({
      platformProducts: [chair],
      bindings: [],
      failures: [{ platformCode: "MOMO_MAIN", message: "缺少 MOMO_SCM_ENTP_ID 設定。" }],
    }),
  );
  const user = mountView();
  await user.click(await screen.findByRole("button", { name: "查詢" }));

  // momo 分頁查詢失敗，警告就地顯示而不是整頁空白。
  assert.ok(await screen.findByText(/MOMO 購物網 商品查詢失敗：缺少 MOMO_SCM_ENTP_ID 設定。/));
  assert.ok(screen.getByText("此平台目前查無商品。"));

  loadMergeBindingPageData.mockResolvedValue(pageData({ platformProducts: [chair], bindings: [] }));
  await user.click(screen.getByRole("tab", { name: /Mo 店\+/ }));
  await user.click(screen.getByRole("button", { name: "查詢" }));

  assert.ok(await screen.findByText(chair.name));
  assert.equal(screen.queryByText(/商品查詢失敗/), null);
});

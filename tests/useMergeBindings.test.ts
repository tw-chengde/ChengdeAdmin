import { act, renderHook, waitFor } from "@testing-library/react";
import assert from "node:assert/strict";
import { createElement, type ReactNode } from "react";
import { beforeEach, test, vi } from "vitest";
import type { PlatformProduct } from "@/app/lib/platforms/product";
import type { PlatformStatus } from "@/app/types/platform";
import type { MergeBindingPageData } from "@/app/types/product-binding";

const listPlatformStatuses = vi.fn();
const loadMergeBindingPageData = vi.fn();

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listPlatformStatuses: () => listPlatformStatuses(),
}));

vi.mock("@/app/dashboard/merge-actions", () => ({
  loadMergeBindingPageData: (query: unknown) => loadMergeBindingPageData(query),
  bindPlatformProduct: vi.fn(),
  unbindPlatformProduct: vi.fn(),
}));

const { PlatformSettingsProvider } = await import("@/app/dashboard/platform-settings-context");
const { useMergeBindings } = await import("@/app/hooks/useMergeBindings");

const momoStatus: PlatformStatus = { code: "MOMO_MAIN", name: "MOMO 購物網", logo: "/images/momo.png", enabled: true };
const moStorePlusStatus: PlatformStatus = { code: "MO_STORE_PLUS", name: "Mo 店+", logo: "/images/mo-store.jpg", enabled: true };

function platformProduct(goodsCode: string, name: string): PlatformProduct {
  return {
    id: `MOMO_MAIN:${goodsCode}`,
    platformCode: "MOMO_MAIN",
    goodsCode,
    name,
    entpGoodsNo: null,
    salePrice: null,
    listingStatus: "LISTED",
    skuCount: 1,
  };
}

function pageData(products: PlatformProduct[]): MergeBindingPageData {
  return { platformProducts: products, failures: [], bindings: [], products: [] };
}

const wrapper = ({ children }: { children: ReactNode }) => createElement(PlatformSettingsProvider, null, children);

async function renderMergeBindings() {
  const rendered = renderHook(() => useMergeBindings(), { wrapper });
  await waitFor(() => assert.equal(rendered.result.current.enabledPlatforms.length, 2));
  return rendered;
}

beforeEach(() => {
  vi.clearAllMocks();
  listPlatformStatuses.mockResolvedValue([momoStatus, moStorePlusStatus]);
  loadMergeBindingPageData.mockResolvedValue(pageData([]));
});

test("進入畫面時不自動查詢，按下查詢才載入", async () => {
  const { result } = await renderMergeBindings();

  assert.equal(loadMergeBindingPageData.mock.calls.length, 0);
  assert.equal(result.current.searched, false);

  await act(async () => {
    result.current.search();
  });

  assert.equal(loadMergeBindingPageData.mock.calls.length, 1);
  assert.deepEqual(loadMergeBindingPageData.mock.calls[0][0], {
    platformCode: "MOMO_MAIN",
    listingStatus: "LISTED",
  });
  assert.equal(result.current.searched, true);
});

// 連按兩次查詢且第一次較慢回來時，畫面若採用先回來的舊結果，看起來就像查詢壞掉。
test("同一平台只採用最後一次查詢的結果", async () => {
  const slow = platformProduct("1000000", "先送出但較慢回來");
  const fast = platformProduct("1000001", "後送出但較快回來");

  let resolveSlow: (value: MergeBindingPageData) => void = () => {};
  loadMergeBindingPageData
    .mockImplementationOnce(() => new Promise<MergeBindingPageData>((resolve) => { resolveSlow = resolve; }))
    .mockImplementationOnce(() => Promise.resolve(pageData([fast])));

  const { result } = await renderMergeBindings();

  await act(async () => {
    result.current.search();
  });
  await act(async () => {
    result.current.search();
  });
  await waitFor(() => assert.equal(result.current.visibleProducts.length, 1));
  assert.equal(result.current.visibleProducts[0].goodsCode, fast.goodsCode);

  // 第一次查詢此時才回來，必須被丟掉。
  await act(async () => {
    resolveSlow(pageData([slow]));
  });

  assert.deepEqual(
    result.current.visibleProducts.map((item) => item.goodsCode),
    [fast.goodsCode],
  );
});

test("查詢失敗時保留上一次的結果並顯示錯誤", async () => {
  const existing = platformProduct("1000000", "上一次查到的商品");
  loadMergeBindingPageData
    .mockResolvedValueOnce(pageData([existing]))
    .mockRejectedValueOnce(new Error("平台連線逾時"));

  const { result } = await renderMergeBindings();

  await act(async () => {
    result.current.search();
  });
  await waitFor(() => assert.equal(result.current.visibleProducts.length, 1));

  await act(async () => {
    result.current.search();
  });
  await waitFor(() => assert.equal(result.current.loadError, "平台連線逾時"));

  assert.deepEqual(
    result.current.visibleProducts.map((item) => item.goodsCode),
    [existing.goodsCode],
  );
});

// 平台查詢很慢，切走再切回來若要重查一次，使用者等於白等兩次。
test("切換平台會保留各平台已查到的結果", async () => {
  const momoProduct = platformProduct("1000000", "momo 商品");
  loadMergeBindingPageData.mockResolvedValueOnce(pageData([momoProduct]));

  const { result } = await renderMergeBindings();

  await act(async () => {
    result.current.search();
  });
  await waitFor(() => assert.equal(result.current.visibleProducts.length, 1));

  act(() => result.current.selectChannel("MO_STORE_PLUS"));
  assert.equal(result.current.selectedChannel, "MO_STORE_PLUS");
  assert.equal(result.current.searched, false, "另一個平台尚未查詢過");
  assert.equal(result.current.visibleProducts.length, 0);

  act(() => result.current.selectChannel("MOMO_MAIN"));
  assert.equal(result.current.searched, true);
  assert.deepEqual(
    result.current.visibleProducts.map((item) => item.goodsCode),
    [momoProduct.goodsCode],
  );
  // 切回來不應該再打一次平台 API。
  assert.equal(loadMergeBindingPageData.mock.calls.length, 1);
});

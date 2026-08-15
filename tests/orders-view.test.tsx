import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PlatformStatus } from "@/app/types/platform";
import { PlatformSettingsProvider } from "@/app/dashboard/platform-settings-context";
import { mockOrders } from "./mocks/orders";

const loadOrdersPageData = vi.fn();
const listPlatformStatuses = vi.fn();

vi.mock("@/app/dashboard/orders-actions", () => ({
  loadOrdersPageData: (
    dateRange: { startDate: string; endDate: string },
    channelFilter?: string,
    filters?: { status?: string; deliveryType?: string; storeDeliveryType?: string; shippingStatus?: string },
  ) => loadOrdersPageData(dateRange, channelFilter, filters),
}));

vi.mock("@/app/dashboard/platforms-actions", () => ({
  listPlatformStatuses: () => listPlatformStatuses(),
}));

const { default: OrdersView } = await import("@/app/dashboard/orders-view");

const momoStatus: PlatformStatus = { code: "MOMO_MAIN", name: "MOMO 購物網", logo: "/images/momo.png", enabled: true };
const moStorePlusStatus: PlatformStatus = { code: "MO_STORE_PLUS", name: "Mo 店+", logo: "/images/mo-store.jpg", enabled: true };

beforeEach(() => {
  vi.clearAllMocks();
  loadOrdersPageData.mockResolvedValue(mockOrders);
  listPlatformStatuses.mockResolvedValue([momoStatus, moStorePlusStatus]);
});

async function renderOrders() {
  render(
    <PlatformSettingsProvider>
      <OrdersView />
    </PlatformSettingsProvider>
  );
  await screen.findAllByRole("tab");
}

/** 按下搜尋列的「載入訂單」。 */
function submitSearch() {
  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);
}

/** 依序展開下拉選單並選取指定選項。 */
async function selectOptions(selections: string[][]) {
  for (const [label, option] of selections) {
    fireEvent.mouseDown(screen.getByLabelText(label));
    fireEvent.click(await screen.findByRole("option", { name: option }));
  }
}

/** 最後一次查詢送出的通路與篩選條件。 */
function lastQuery() {
  const call = loadOrdersPageData.mock.calls.at(-1);
  return { channel: call?.[1], filters: call?.[2] };
}

test("分頁只顯示啟用中的平台", async () => {
  await renderOrders();

  assert.ok(screen.getByRole("tab", { name: /MOMO 購物網/ }));
  assert.ok(screen.getByRole("tab", { name: /Mo 店\+/ }));
  assert.equal(screen.queryByRole("tab", { name: "全部電商通路" }), null);

  // 在設定頁停用 Mo 店+ 後，訂單頁不應再出現該分頁。
  cleanup();
  listPlatformStatuses.mockResolvedValue([momoStatus, { ...moStorePlusStatus, enabled: false }]);
  await renderOrders();

  assert.ok(screen.getByRole("tab", { name: /MOMO 購物網/ }));
  assert.equal(screen.queryByRole("tab", { name: /Mo 店\+/ }), null);
});

test("does not request orders until search is submitted", async () => {
  await renderOrders();
  assert.equal(loadOrdersPageData.mock.calls.length, 0);
});

test("keyword search filters loaded orders without requesting the API again", async () => {
  await renderOrders();

  submitSearch();
  await screen.findByText(mockOrders[0].orderNo);
  assert.equal(loadOrdersPageData.mock.calls.length, 1);

  fireEvent.change(screen.getByPlaceholderText("搜尋訂單編號 / 買家 / 商品"), {
    target: { value: mockOrders[0].orderNo },
  });

  assert.ok(screen.getByText(mockOrders[0].orderNo));
  assert.equal(loadOrdersPageData.mock.calls.length, 1);
});

test("marks a MOMO shipping store-pickup order with its convenience-store brand", async () => {
  loadOrdersPageData.mockResolvedValue([{
    ...mockOrders[2],
    pickupStore: { brand: "7-ELEVEN", name: "前港" },
  }]);
  await renderOrders();

  submitSearch();

  assert.ok(await screen.findByText("超商：7-ELEVEN"));
});

test("出貨中訂單在正規化狀態之外顯示平台細狀態", async () => {
  loadOrdersPageData.mockResolvedValue([{ ...mockOrders[2], status: "配送中", statusDetail: "已印單" }]);
  await renderOrders();

  submitSearch();

  assert.ok(await screen.findByText("已印單"));
  assert.ok(screen.getByText("配送中"));
});

test("shows an error after a failed search", async () => {
  loadOrdersPageData.mockRejectedValue(new Error("load failure"));
  await renderOrders();

  submitSearch();

  assert.ok(await screen.findByText("load failure"));
});

test("搜尋列預設近七天，且結束日期最多為開始日起 30 天", async () => {
  await renderOrders();

  const startDate = screen.getByLabelText("開始日期") as HTMLInputElement;
  const endDate = screen.getByLabelText("結束日期") as HTMLInputElement;
  const start = new Date(`${startDate.value}T00:00:00`);
  const end = new Date(`${endDate.value}T00:00:00`);
  const maxEnd = new Date(`${startDate.value}T00:00:00`);
  maxEnd.setDate(maxEnd.getDate() + 30);

  assert.equal((end.getTime() - start.getTime()) / 86_400_000, 6);
  assert.equal(endDate.min, startDate.value);
  assert.equal(endDate.max, `${maxEnd.getFullYear()}-${String(maxEnd.getMonth() + 1).padStart(2, "0")}-${String(maxEnd.getDate()).padStart(2, "0")}`);
  assert.ok(screen.getByRole("button", { name: "載入訂單" }));
});

test("date searches reload orders with the selected range", async () => {
  await renderOrders();
  const [startDate, endDate] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
  assert.ok(startDate);
  assert.ok(endDate);

  fireEvent.change(startDate, { target: { value: "2026-08-02" } });
  fireEvent.change(endDate, { target: { value: "2026-08-03" } });
  submitSearch();

  await waitFor(() => {
    assert.deepEqual(loadOrdersPageData.mock.calls.at(-1)?.[0], {
      startDate: "2026-08-02",
      endDate: "2026-08-03",
    });
  });
  assert.equal(loadOrdersPageData.mock.calls.length, 1);
});

// 各平台的下拉選單送出的是該平台的原生值：mo店+ 的超取分類是取件流向
//（StoreToStoreShip…），momo 的則是超商品牌代碼（dely_gb）。
test.each([
  {
    name: "Mo 店+ 的訂單狀態送出平台原生值",
    tab: /Mo 店\+/,
    channel: "MO_STORE_PLUS",
    selections: [["訂單狀態", "配送中"]],
    expected: { status: "Shipping" },
  },
  {
    name: "Mo 店+ 的配送類型與超取分類送出取件流向",
    tab: /Mo 店\+/,
    channel: "MO_STORE_PLUS",
    selections: [["配送類型", "超取"], ["超取分類", "店到店配送"]],
    expected: { deliveryType: "Store", storeDeliveryType: "StoreToStoreShip" },
  },
  {
    name: "MOMO 購物網的訂單狀態可選擇出貨中",
    tab: /MOMO 購物網/,
    channel: "MOMO_MAIN",
    selections: [["訂單狀態", "出貨中"]],
    expected: { status: "SHIPPING" },
  },
  {
    name: "MOMO 購物網的配送類型與超商別送出超商代碼",
    tab: /MOMO 購物網/,
    channel: "MOMO_MAIN",
    selections: [["配送類型", "超商取貨"], ["超取分類", "全家 店到店"]],
    expected: { deliveryType: "Store", storeDeliveryType: "29" },
  },
])("$name", async ({ tab, channel, selections, expected }) => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: tab }));
  await selectOptions(selections);
  submitSearch();

  await waitFor(() => {
    assert.equal(lastQuery().channel, channel);
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(lastQuery().filters?.[key as keyof typeof expected], value, key);
    }
  });
});

test.each([
  { delivery: "宅配", deliveryType: "Home" },
  { delivery: "第三方物流", deliveryType: "ThirdParty" },
])("Mo 店+ 配送類型選取$delivery時，超取分類下拉選單會隱藏並帶入全部", async ({ delivery, deliveryType }) => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: /Mo 店\+/ }));
  await selectOptions([["配送類型", delivery]]);

  assert.equal(screen.queryByLabelText("超取分類"), null);
  submitSearch();

  await waitFor(() => {
    assert.equal(lastQuery().channel, "MO_STORE_PLUS");
    assert.equal(lastQuery().filters?.deliveryType, deliveryType);
    assert.equal(lastQuery().filters?.storeDeliveryType, "All");
  });
});

test("MOMO 購物網選取出貨中與配送類型後，才會出現出貨中狀態下拉選單", async () => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: /MOMO 購物網/ }));
  assert.equal(screen.queryByLabelText("出貨中狀態"), null);

  // 只選出貨中還不夠：配送類型仍是「全部」，兩種配送方式的細狀態代碼並不共用。
  await selectOptions([["訂單狀態", "出貨中"]]);
  assert.equal(screen.queryByLabelText("出貨中狀態"), null);

  await selectOptions([["配送類型", "第三方物流"], ["出貨中狀態", "配送中"]]);
  submitSearch();

  await waitFor(() => {
    assert.equal(lastQuery().filters?.status, "SHIPPING");
    assert.equal(lastQuery().filters?.deliveryType, "ThirdParty");
    assert.equal(lastQuery().filters?.shippingStatus, "2");
  });
});

test("MOMO 購物網改回未出貨後，出貨中狀態下拉選單會隱藏並帶入全部", async () => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: /MOMO 購物網/ }));
  await selectOptions([
    ["配送類型", "超商取貨"],
    ["訂單狀態", "出貨中"],
    ["出貨中狀態", "待客戶取件"],
    ["訂單狀態", "未出貨"],
  ]);

  assert.equal(screen.queryByLabelText("出貨中狀態"), null);
  submitSearch();

  await waitFor(() => {
    assert.equal(lastQuery().filters?.status, "UNSHIPPED");
    assert.equal(lastQuery().filters?.shippingStatus, "All");
  });
});

test("點擊詳情按鈕可開啟訂單詳細內容彈窗", async () => {
  await renderOrders();

  submitSearch();

  let detailButtons: HTMLElement[] = [];
  await waitFor(() => {
    detailButtons = screen.getAllByRole("button", { name: "詳情" });
    assert.ok(detailButtons.length > 0);
  });

  fireEvent.click(detailButtons[0]);

  assert.ok(await screen.findByText(/訂單詳細內容/));
  assert.ok(screen.getByText("訂購商品清單"));
});

test("沒有商品明細的訂單不會讓整張表格崩潰", async () => {
  loadOrdersPageData.mockResolvedValue([{ ...mockOrders[0], items: [] }]);
  await renderOrders();

  submitSearch();

  assert.ok(await screen.findByText("無商品明細"));
  assert.ok(screen.getByText(mockOrders[0].orderNo));
});

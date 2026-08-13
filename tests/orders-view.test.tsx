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
    filters?: { status?: string; deliveryType?: string; storeDeliveryType?: string },
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

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);
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

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  const [startDate, endDate] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
  assert.ok(startDate);
  assert.ok(endDate);
  fireEvent.change(startDate, { target: { value: "2026-08-01" } });
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  assert.ok(await screen.findByText("超商：7-ELEVEN"));
});

test("shows an error after a failed search", async () => {
  loadOrdersPageData.mockRejectedValue(new Error("load failure"));
  await renderOrders();
  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);

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
  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(startDate);
  assert.ok(endDate);
  assert.ok(searchButton);

  fireEvent.change(startDate, { target: { value: "2026-08-02" } });
  fireEvent.change(endDate, { target: { value: "2026-08-03" } });
  fireEvent.click(searchButton);

  await waitFor(() => {
    assert.deepEqual(loadOrdersPageData.mock.calls.at(-1)?.[0], {
      startDate: "2026-08-02",
      endDate: "2026-08-03",
    });
  });
  assert.equal(loadOrdersPageData.mock.calls.length, 1);
});

test("狀態改為平台對應的下拉選單，並把 Mo 店+ 原生值傳入查詢", async () => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: /Mo 店\+/ }));
  fireEvent.mouseDown(screen.getByLabelText("訂單狀態"));
  fireEvent.click(await screen.findByRole("option", { name: "配送中" }));

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  await waitFor(() => {
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[1], "MO_STORE_PLUS");
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2]?.status, "Shipping");
  });
});

test("Mo 店+ 切換配送類型與超取分類，並將選取值傳入 loadOrdersPageData", async () => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: /Mo 店\+/ }));

  fireEvent.mouseDown(screen.getByLabelText("配送類型"));
  fireEvent.click(await screen.findByRole("option", { name: "超取" }));

  fireEvent.mouseDown(screen.getByLabelText("超取分類"));
  fireEvent.click(await screen.findByRole("option", { name: "7-ELEVEN" }));

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  await waitFor(() => {
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[1], "MO_STORE_PLUS");
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2]?.deliveryType, "Store");
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2]?.storeDeliveryType, "1");
  });
});

test("Mo 店+ 配送類型選取宅配時，超取分類下拉選單會隱藏並帶入全部", async () => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: /Mo 店\+/ }));

  fireEvent.mouseDown(screen.getByLabelText("配送類型"));
  fireEvent.click(await screen.findByRole("option", { name: "宅配" }));

  assert.equal(screen.queryByLabelText("超取分類"), null);

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  await waitFor(() => {
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[1], "MO_STORE_PLUS");
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2]?.deliveryType, "Home");
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2]?.storeDeliveryType, "All");
  });
});

test("Mo 店+ 配送類型可選取第三方物流並傳入 ThirdParty", async () => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: /Mo 店\+/ }));

  fireEvent.mouseDown(screen.getByLabelText("配送類型"));
  fireEvent.click(await screen.findByRole("option", { name: "第三方物流" }));

  assert.equal(screen.queryByLabelText("超取分類"), null);

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  await waitFor(() => {
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[1], "MO_STORE_PLUS");
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2]?.deliveryType, "ThirdParty");
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2]?.storeDeliveryType, "All");
  });
});

test("MOMO 購物網狀態下拉選單可選擇出貨中", async () => {
  await renderOrders();

  fireEvent.click(screen.getByRole("tab", { name: /MOMO 購物網/ }));
  fireEvent.mouseDown(screen.getByLabelText("訂單狀態"));
  fireEvent.click(await screen.findByRole("option", { name: "出貨中" }));

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  await waitFor(() => {
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[1], "MOMO_MAIN");
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2]?.status, "SHIPPING");
  });
});

test("點擊詳情按鈕可開啟訂單詳細內容彈窗", async () => {
  await renderOrders();

  const [startDate, endDate] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(startDate);
  assert.ok(endDate);
  assert.ok(searchButton);

  fireEvent.change(startDate, { target: { value: "2026-08-01" } });
  fireEvent.change(endDate, { target: { value: "2026-08-01" } });
  fireEvent.click(searchButton);

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

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  assert.ok(await screen.findByText("無商品明細"));
  assert.ok(screen.getByText(mockOrders[0].orderNo));
});

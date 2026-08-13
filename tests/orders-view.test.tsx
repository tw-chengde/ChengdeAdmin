import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PlatformStatus } from "@/app/types/platform";
import { PlatformSettingsProvider } from "@/app/dashboard/platform-settings-context";
import { mockOrders } from "./mocks/orders";

const loadOrdersPageData = vi.fn();
const listPlatformStatuses = vi.fn();

vi.mock("@/app/dashboard/orders-actions", () => ({
  loadOrdersPageData: (dateRange: { startDate: string; endDate: string }, channelFilter?: string, status?: string) => loadOrdersPageData(dateRange, channelFilter, status),
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
test("marks a MOMO shipping store-pickup order with its convenience-store brand and branch", async () => {
  loadOrdersPageData.mockResolvedValue([{
    ...mockOrders[2],
    pickupStore: { brand: "7-ELEVEN", name: "\u524d\u6e2f" },
  }]);
  await renderOrders();

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  const [startDate, endDate] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
  assert.ok(startDate);
  assert.ok(endDate);
  fireEvent.change(startDate, { target: { value: "2026-08-01" } });
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  assert.ok(await screen.findByText("\u8d85\u5546\uff1a7-ELEVEN \u00b7 \u524d\u6e2f"));
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
  assert.ok(screen.getByRole("button", { name: "搜尋" }));
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
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2], "Shipping");
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
    assert.equal(loadOrdersPageData.mock.calls.at(-1)?.[2], "SHIPPING");
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
// 迴歸測試：平台可能回傳沒有任何品項的訂單（例如整張單都已取消）。
// 過去這裡直接存取 order.items[0].name，一筆這樣的訂單就會讓整張表格崩潰。
test("沒有商品明細的訂單不會讓整張表格崩潰", async () => {
  loadOrdersPageData.mockResolvedValue([{ ...mockOrders[0], items: [] }]);
  await renderOrders();

  const searchButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  assert.ok(searchButton);
  fireEvent.click(searchButton);

  assert.ok(await screen.findByText("無商品明細"));
  assert.ok(screen.getByText(mockOrders[0].orderNo));
});

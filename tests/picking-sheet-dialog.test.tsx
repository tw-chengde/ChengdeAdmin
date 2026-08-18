import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { OrderItem } from "@/app/types/order";
import type { Product } from "@/app/types/product";
import type { ProductBinding } from "@/app/types/product-binding";
import { buildPickingSheet } from "@/app/utils/picking";
import PickingSheetDialog from "@/app/dashboard/picking-sheet-dialog";

function order(orderNo: string, items: OrderItem["items"]): OrderItem {
  return {
    id: `id:${orderNo}`,
    channel: "MOMO 購物網",
    channelCode: "MOMO_MAIN",
    orderNo,
    customerName: "客戶",
    address: "",
    items,
    totalAmount: 0,
    status: "待發貨",
    logistics: "",
    trackingNo: "",
    createdAt: "2026-08-01",
  };
}

const boundProduct: Product = {
  id: 1,
  code: "CD-001",
  name: "保溫瓶",
  stock: 3,
  cvs_merge_limit: 0,
  logistics_merge_limit: 0,
  created_at: "2026-01-01",
};

const binding: ProductBinding = {
  id: 1,
  product_id: 1,
  platform_code: "MOMO_MAIN",
  goods_code: "G1",
  goods_name: null,
  created_at: "2026-01-01",
};

beforeEach(() => {
  vi.stubGlobal("print", vi.fn());
});

test("已綁定商品顯示本地商品名稱與庫存不足警示，未綁定商品顯示未綁定標記，且畫面上不顯示單品編號", () => {
  const orders = [
    order("A1", [{ name: "保溫瓶(平台)", spec: "黑", qty: 10, price: 0, goodsCode: "G1", goodsdtCode: "D1" }]),
    order("A2", [{ name: "神秘商品", spec: "", qty: 1, price: 0, goodsCode: "G2" }]),
  ];
  const sheet = buildPickingSheet(orders, [binding], [boundProduct]);

  render(<PickingSheetDialog open onClose={vi.fn()} sheet={sheet} />);
  const onscreenTable = within(screen.getByTestId("picking-onscreen-table"));

  assert.ok(onscreenTable.getByText("CD-001 · 保溫瓶"));
  assert.ok(onscreenTable.getByText(/庫存 3 \/ 需 10/));
  assert.ok(onscreenTable.getByText("神秘商品"));
  assert.ok(onscreenTable.getByText("未綁定"));
  assert.ok(onscreenTable.getByText("訂單編號"));
  assert.ok(onscreenTable.getByText("A1"));
  assert.ok(onscreenTable.getByText("A2"));
  assert.equal(onscreenTable.queryByText("單品編號"), null);
  assert.equal(onscreenTable.queryByText("D1"), null);
});

test("關鍵字搜尋只留下符合的品項組", async () => {
  const orders = [
    order("A1", [{ name: "保溫瓶", spec: "黑", qty: 1, price: 0, goodsCode: "G1" }]),
    order("A2", [{ name: "檯燈", spec: "白", qty: 1, price: 0, goodsCode: "G2" }]),
  ];
  const sheet = buildPickingSheet(orders, [], []);
  const user = userEvent.setup();

  render(<PickingSheetDialog open onClose={vi.fn()} sheet={sheet} />);
  const onscreenTable = within(screen.getByTestId("picking-onscreen-table"));

  await user.type(screen.getByPlaceholderText("搜尋商品編號 / 品名 / 規格"), "檯燈");

  assert.ok(onscreenTable.getByText("檯燈"));
  assert.equal(onscreenTable.queryByText("保溫瓶"), null);
});

test("只看未綁定開關只留下未綁定的品項組", async () => {
  const orders = [
    order("A1", [{ name: "保溫瓶(平台)", spec: "黑", qty: 1, price: 0, goodsCode: "G1" }]),
    order("A2", [{ name: "神秘商品", spec: "", qty: 1, price: 0, goodsCode: "G2" }]),
  ];
  const sheet = buildPickingSheet(orders, [binding], [boundProduct]);
  const user = userEvent.setup();

  render(<PickingSheetDialog open onClose={vi.fn()} sheet={sheet} />);
  const onscreenTable = within(screen.getByTestId("picking-onscreen-table"));
  await user.click(screen.getByRole("checkbox", { name: "只看未綁定" }));

  assert.ok(onscreenTable.getByText("神秘商品"));
  assert.equal(onscreenTable.queryByText("CD-001 · 保溫瓶"), null);
});

test("列印按鈕呼叫 window.print，設定 PDF 預設檔名並在列印後還原，且不顯示 CSV 匯出功能", async () => {
  let capturedTitle = "";
  vi.stubGlobal(
    "print",
    vi.fn(() => {
      capturedTitle = document.title;
    }),
  );
  document.title = "原本的標題";

  const sheet = buildPickingSheet([order("A1", [{ name: "保溫瓶", spec: "黑", qty: 1, price: 0, goodsCode: "G1" }])], [], []);
  const user = userEvent.setup();

  render(<PickingSheetDialog open onClose={vi.fn()} sheet={sheet} />);

  await user.click(screen.getByRole("button", { name: "列印揀貨單" }));
  assert.equal((window.print as ReturnType<typeof vi.fn>).mock.calls.length, 1);
  assert.match(capturedTitle, /^跨平台出貨總揀單_\d{8}_\d{4}$/);
  assert.equal(document.title, "原本的標題");
  assert.equal(screen.queryByRole("button", { name: "匯出 CSV" }), null);
});

test("列印版面是獨立設計，非畫面截圖：含勾選框、簽名欄與訂單編號明細", () => {
  const orders = [
    order("A1", [{ name: "保溫瓶", spec: "黑", qty: 1, price: 0, goodsCode: "G1" }]),
    order("A2", [{ name: "保溫瓶", spec: "黑", qty: 2, price: 0, goodsCode: "G1" }]),
  ];
  const sheet = buildPickingSheet(orders, [], []);

  render(<PickingSheetDialog open onClose={vi.fn()} sheet={sheet} />);
  const printSheet = within(screen.getByTestId("picking-print-sheet"));

  assert.ok(printSheet.getByText("揀貨人簽名：＿＿＿＿＿＿＿＿＿＿"));
  assert.ok(printSheet.getByText(/列印時間：/));
  assert.ok(printSheet.getByText("A1、A2"));
  assert.equal(printSheet.queryByText("單品編號"), null);
  assert.equal(document.querySelectorAll(".picking-print-checkbox").length, 1);
});

test("沒有待發貨訂單時顯示空狀態訊息", () => {
  const sheet = buildPickingSheet([], [], []);

  render(<PickingSheetDialog open onClose={vi.fn()} sheet={sheet} />);

  assert.ok(within(screen.getByRole("dialog")).getByText("查詢區間內沒有待發貨訂單。"));
});

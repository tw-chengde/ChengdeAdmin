import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const previewShipmentPlan = vi.fn();
const confirmShipmentPlan = vi.fn();
const executeShipmentBatch = vi.fn();

vi.mock("@/app/dashboard/shipping-actions", () => ({
  previewShipmentPlan: (...args: unknown[]) => previewShipmentPlan(...args),
  confirmShipmentPlan: (...args: unknown[]) => confirmShipmentPlan(...args),
  executeShipmentBatch: (...args: unknown[]) => executeShipmentBatch(...args),
}));

const { useOneClickShipment } = await import("@/app/hooks/useOneClickShipment");
const { default: ShippingDispatchDialog } = await import("@/app/dashboard/shipping-dispatch-dialog");

const dateRange = { startDate: "2026-08-01", endDate: "2026-08-07" };

function Harness({ onFinished }: { onFinished?: () => void }) {
  const dispatch = useOneClickShipment(onFinished);
  return (
    <>
      <button type="button" onClick={() => dispatch.preview(dateRange)}>
        開啟
      </button>
      <ShippingDispatchDialog dispatch={dispatch} dateRange={dateRange} onClose={() => {}} />
    </>
  );
}

function blockedGroup() {
  return {
    platformCode: "MOMO_MAIN",
    routeId: "MOMO_MAIN:STORE",
    routeLabel: "超商取貨",
    steps: [],
    orders: [{ id: "m1", orderNo: "M1" }],
    batches: [],
    packaging: null,
    blocked: "PACKAGING_NOT_CONFIGURED",
  };
}

function openGroup(orderIds: string[]) {
  return {
    platformCode: "MOMO_MAIN",
    routeId: "MOMO_MAIN:STORE",
    routeLabel: "超商取貨",
    steps: [{ id: "confirm", label: "出貨確認" }],
    orders: orderIds.map((id) => ({ id, orderNo: id })),
    batches: [{ orderNos: orderIds }],
    packaging: null,
    blocked: null,
  };
}

function plan(groups: unknown[]) {
  const orderCount = (groups as { orders: unknown[] }[]).reduce((sum, group) => sum + group.orders.length, 0);
  const automatable = (groups as { orders: unknown[]; blocked: unknown }[])
    .filter((group) => !group.blocked)
    .reduce((sum, group) => sum + group.orders.length, 0);
  return { groups, warnings: [], totals: { orderCount, automatableOrderCount: automatable }, preparedAt: "2026-08-16T00:00:00.000Z" };
}

beforeEach(() => {
  vi.clearAllMocks();
});


test("包材未設定的路徑顯示為需人工處理，且送出按鈕只計入可自動化的訂單數", async () => {
  previewShipmentPlan.mockResolvedValue(plan([blockedGroup()]));
  const user = userEvent.setup();
  render(<Harness />);

  await user.click(screen.getByRole("button", { name: "開啟" }));

  await waitFor(() => assert.ok(screen.getByText("包材尚未設定，需人工處理")));
  assert.ok(screen.getByText(/共 0 筆將送出/));
  // 沒有任何可自動化訂單時，主要出貨按鈕不會出現。
  assert.equal(screen.queryByRole("button", { name: /開始批次出貨/ }), null);
});

test("未確認不會呼叫 executeShipmentBatch", async () => {
  previewShipmentPlan.mockResolvedValue(plan([openGroup(["M1"])]));
  const user = userEvent.setup();
  render(<Harness />);

  await user.click(screen.getByRole("button", { name: "開啟" }));
  await waitFor(() => assert.ok(screen.getByRole("button", { name: /開始批次出貨/ })));

  // 只是把對話框關掉，不點確認送出。
  await user.click(screen.getByRole("button", { name: "取消" }));

  assert.equal(executeShipmentBatch.mock.calls.length, 0);
  assert.equal(confirmShipmentPlan.mock.calls.length, 0);
});

test("點擊開始批次出貨後依序確認並執行，ALREADY_DONE 顯示為成功", async () => {
  previewShipmentPlan.mockResolvedValue(plan([openGroup(["M1"])]));
  confirmShipmentPlan.mockResolvedValue({ plan: plan([openGroup(["M1"])]), drift: { added: [], removed: [] } });
  executeShipmentBatch.mockResolvedValue({
    routeId: "MOMO_MAIN:STORE",
    results: [{ orderNo: "M1", state: "ALREADY_DONE", message: undefined }],
    documents: [],
  });
  const user = userEvent.setup();
  render(<Harness />);

  await user.click(screen.getByRole("button", { name: "開啟" }));
  await waitFor(() => assert.ok(screen.getByRole("button", { name: /開始批次出貨/ })));
  await user.click(screen.getByRole("button", { name: /開始批次出貨/ }));

  await waitFor(() => assert.ok(screen.getByText(/已出貨（重複） 1/)));
  assert.equal(confirmShipmentPlan.mock.calls.length, 1);
  assert.equal(executeShipmentBatch.mock.calls.length, 1);
});

test("重新確認時發現訂單消失，顯示警示並要求重新整理，不會自動送出", async () => {
  previewShipmentPlan.mockResolvedValue(plan([openGroup(["M1"])]));
  confirmShipmentPlan.mockResolvedValue({ plan: plan([openGroup(["M1"])]), drift: { added: [], removed: ["m1"] } });
  const user = userEvent.setup();
  render(<Harness />);

  await user.click(screen.getByRole("button", { name: "開啟" }));
  await waitFor(() => assert.ok(screen.getByRole("button", { name: /開始批次出貨/ })));
  await user.click(screen.getByRole("button", { name: /開始批次出貨/ }));

  await waitFor(() => assert.ok(screen.getByText(/在預覽後已消失/)));
  assert.equal(executeShipmentBatch.mock.calls.length, 0);
  assert.ok(screen.getByRole("button", { name: "重新整理候選清單" }));
});

test("整批跑完後呼叫 onFinished", async () => {
  previewShipmentPlan.mockResolvedValue(plan([openGroup(["M1"])]));
  confirmShipmentPlan.mockResolvedValue({ plan: plan([openGroup(["M1"])]), drift: { added: [], removed: [] } });
  executeShipmentBatch.mockResolvedValue({ routeId: "MOMO_MAIN:STORE", results: [{ orderNo: "M1", state: "SUCCESS" }], documents: [] });
  const onFinished = vi.fn();
  const user = userEvent.setup();
  render(<Harness onFinished={onFinished} />);

  await user.click(screen.getByRole("button", { name: "開啟" }));
  await waitFor(() => assert.ok(screen.getByRole("button", { name: /開始批次出貨/ })));
  await user.click(screen.getByRole("button", { name: /開始批次出貨/ }));

  await waitFor(() => assert.equal(onFinished.mock.calls.length, 1));
});

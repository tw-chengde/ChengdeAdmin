import { act, renderHook, waitFor } from "@testing-library/react";
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

beforeEach(() => {
  vi.clearAllMocks();
});

const dateRange = { startDate: "2026-08-01", endDate: "2026-08-07" };

function group(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    platformCode: "MOMO_MAIN",
    routeId: "MOMO_MAIN:STORE",
    routeLabel: "超商取貨",
    steps: [],
    orders: [{ id: "m1", orderNo: "M1" }],
    batches: [{ orderNos: ["M1"] }],
    packaging: null,
    blocked: null,
    ...overrides,
  };
}

function plan(groups = [group()]) {
  return { groups, warnings: [], totals: { orderCount: groups.length, automatableOrderCount: groups.length }, preparedAt: "2026-08-16T00:00:00.000Z" };
}

test("preview 成功後進入 AWAITING_CONFIRM 並帶回 plan", async () => {
  previewShipmentPlan.mockResolvedValue(plan());
  const { result } = renderHook(() => useOneClickShipment());

  await act(async () => {
    await result.current.preview(dateRange);
  });

  assert.equal(result.current.phase, "AWAITING_CONFIRM");
  assert.equal(result.current.plan?.totals.orderCount, 1);
});

test("第二批在第一批 resolve 之後才發出", async () => {
  previewShipmentPlan.mockResolvedValue(
    plan([
      group({ routeId: "A", batches: [{ orderNos: ["1"] }, { orderNos: ["2"] }] }),
    ]),
  );
  confirmShipmentPlan.mockResolvedValue({ plan: plan([group({ routeId: "A", batches: [{ orderNos: ["1"] }, { orderNos: ["2"] }] })]), drift: { added: [], removed: [] } });

  let resolveFirst: (() => void) | undefined;
  const callTimeline: string[] = [];
  executeShipmentBatch.mockImplementation((input: { orderNos: string[] }) => {
    const orderNo = input.orderNos[0];
    callTimeline.push(`start:${orderNo}`);
    if (orderNo === "1") {
      return new Promise((resolve) => {
        resolveFirst = () => {
          callTimeline.push(`resolve:${orderNo}`);
          resolve({ routeId: "A", results: [{ orderNo: "1", state: "SUCCESS" }], documents: [] });
        };
      });
    }
    callTimeline.push(`resolve:${orderNo}`);
    return Promise.resolve({ routeId: "A", results: [{ orderNo: "2", state: "SUCCESS" }], documents: [] });
  });

  const { result } = renderHook(() => useOneClickShipment());
  await act(async () => {
    await result.current.preview(dateRange);
  });
  await act(async () => {
    await result.current.confirm(dateRange);
  });

  const runPromise = act(async () => {
    await result.current.run(dateRange);
  });

  // 還沒 resolve 第一批之前，第二批不該被呼叫。
  await waitFor(() => assert.equal(callTimeline.includes("start:1"), true));
  assert.equal(callTimeline.includes("start:2"), false);

  resolveFirst?.();
  await runPromise;

  assert.deepEqual(callTimeline, ["start:1", "resolve:1", "start:2", "resolve:2"]);
  assert.equal(result.current.phase, "DONE");
  assert.equal(result.current.results.length, 2);
});

test("中途某批失敗仍保留前面批次的結果，並繼續跑完剩下的批次", async () => {
  previewShipmentPlan.mockResolvedValue(plan([group({ routeId: "A", batches: [{ orderNos: ["1"] }, { orderNos: ["2"] }] })]));
  confirmShipmentPlan.mockResolvedValue({
    plan: plan([group({ routeId: "A", batches: [{ orderNos: ["1"] }, { orderNos: ["2"] }] })]),
    drift: { added: [], removed: [] },
  });
  executeShipmentBatch
    .mockResolvedValueOnce({ routeId: "A", results: [{ orderNo: "1", state: "SUCCESS" }], documents: [] })
    .mockRejectedValueOnce(new Error("平台逾時"));

  const { result } = renderHook(() => useOneClickShipment());
  await act(async () => {
    await result.current.preview(dateRange);
    await result.current.confirm(dateRange);
    await result.current.run(dateRange);
  });

  assert.deepEqual(result.current.results, [
    { orderNo: "1", state: "SUCCESS" },
    { orderNo: "2", state: "FAILED", message: "平台逾時" },
  ]);
  assert.equal(result.current.phase, "DONE");
});

test("drift.removed 非空時 run 不會自動執行任何批次", async () => {
  previewShipmentPlan.mockResolvedValue(plan());
  confirmShipmentPlan.mockResolvedValue({ plan: plan(), drift: { added: [], removed: ["m1"] } });

  const { result } = renderHook(() => useOneClickShipment());
  await act(async () => {
    await result.current.preview(dateRange);
    await result.current.confirm(dateRange);
  });

  assert.deepEqual(result.current.drift, { added: [], removed: ["m1"] });

  await act(async () => {
    await result.current.run(dateRange);
  });

  assert.equal(executeShipmentBatch.mock.calls.length, 0);
  assert.equal(result.current.phase, "AWAITING_CONFIRM");
});

test("onFinished 在整批跑完後被呼叫一次", async () => {
  previewShipmentPlan.mockResolvedValue(plan());
  confirmShipmentPlan.mockResolvedValue({ plan: plan(), drift: { added: [], removed: [] } });
  executeShipmentBatch.mockResolvedValue({ routeId: "MOMO_MAIN:STORE", results: [{ orderNo: "M1", state: "SUCCESS" }], documents: [] });
  const onFinished = vi.fn();

  const { result } = renderHook(() => useOneClickShipment(onFinished));
  await act(async () => {
    await result.current.preview(dateRange);
    await result.current.confirm(dateRange);
    await result.current.run(dateRange);
  });

  assert.equal(onFinished.mock.calls.length, 1);
});

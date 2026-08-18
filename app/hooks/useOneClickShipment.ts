"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { confirmShipmentPlan, executeShipmentBatch, previewShipmentPlan } from "@/app/dashboard/shipping-actions";
import type { ShipmentBatchResult, ShipmentOrderResult, ShipmentPlan } from "@/app/types/shipment";
import { errorMessage } from "@/app/utils/errors";
import type { OrderDateRange } from "@/app/utils/orders";

export type OneClickShipmentPhase = "IDLE" | "PREVIEWING" | "AWAITING_CONFIRM" | "RUNNING" | "DONE";

export interface ShipmentDrift {
  added: string[];
  removed: string[];
}

export interface OneClickShipmentState {
  phase: OneClickShipmentPhase;
  plan: ShipmentPlan | null;
  drift: ShipmentDrift | null;
  error: string | null;
  progress: { completedBatches: number; totalBatches: number };
  results: ShipmentOrderResult[];
  documents: ShipmentBatchResult["documents"];
}

const initialState: OneClickShipmentState = {
  phase: "IDLE",
  plan: null,
  drift: null,
  error: null,
  progress: { completedBatches: 0, totalBatches: 0 },
  results: [],
  documents: [],
};

/**
 * 一鍵／單通路／單筆出貨共用的批次執行狀態機。
 *
 * 批次在 client 端依序 `for await` 執行，每個批次各自是一個獨立的 server action 呼叫
 * （子請求數才與訂單量無關），而不是把整批塞進單一 server action 裡跑迴圈。
 * `onFinished` 在整批跑完後呼叫，讓外部（例如揀貨單畫面）知道要重新整理。
 */
export function useOneClickShipment(onFinished?: () => void) {
  const [state, setState] = useState<OneClickShipmentState>(initialState);
  const mounted = useRef(true);
  const planRef = useRef<ShipmentPlan | null>(null);
  const driftRef = useRef<ShipmentDrift | null>(null);
  const selectedIdsRef = useRef<string[] | undefined>(undefined);
  // reset() 會讓這個世代號失效，讓 reset 之後才回來的 preview/confirm 結果被忽略
  // （例如預覽中途按取消，畫面已經關閉，稍後回來的結果不該讓對話框自己重新打開）。
  const generation = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const preview = useCallback(async (dateRange: OrderDateRange, selectedIds?: string[]) => {
    const gen = ++generation.current;
    selectedIdsRef.current = selectedIds;
    setState((prev) => ({ ...prev, phase: "PREVIEWING", error: null, drift: null }));
    try {
      const plan = await previewShipmentPlan(dateRange, selectedIds);
      if (!mounted.current || gen !== generation.current) return;
      planRef.current = plan;
      driftRef.current = null;
      setState((prev) => ({ ...prev, phase: "AWAITING_CONFIRM", plan, drift: null }));
    } catch (err) {
      if (!mounted.current || gen !== generation.current) return;
      setState((prev) => ({ ...prev, phase: "IDLE", error: errorMessage(err, "預覽出貨計畫失敗") }));
    }
  }, []);

  /** 預覽後訂單有異動時用來重新整理候選清單（沿用開啟時的 selectedIds 範圍）。 */
  const refresh = useCallback((dateRange: OrderDateRange) => preview(dateRange, selectedIdsRef.current), [preview]);

  /**
   * 重查候選訂單並回報與預覽時的落差。回傳值供呼叫端立即判斷是否要接著送出，
   * 不能只看 `state.drift`——setState 是非同步的，呼叫完成當下讀不到最新值。
   */
  const confirm = useCallback(async (dateRange: OrderDateRange): Promise<ShipmentDrift | null> => {
    const gen = generation.current;
    const plan = planRef.current;
    if (!plan) return null;
    const orderIds = plan.groups.flatMap((group) => group.orders.map((order) => order.id));

    setState((prev) => ({ ...prev, error: null }));
    try {
      const { plan: freshPlan, drift } = await confirmShipmentPlan(dateRange, orderIds);
      if (!mounted.current || gen !== generation.current) return null;
      planRef.current = freshPlan;
      driftRef.current = drift;
      setState((prev) => ({ ...prev, plan: freshPlan, drift }));
      return drift;
    } catch (err) {
      if (!mounted.current || gen !== generation.current) return null;
      setState((prev) => ({ ...prev, error: errorMessage(err, "確認出貨計畫失敗") }));
      return null;
    }
  }, []);

  const run = useCallback(
    async (dateRange: OrderDateRange) => {
      const gen = generation.current;
      const plan = planRef.current;
      if (!plan) return;
      // 預覽後訂單消失（甲配每分鐘轉單）要停下來要求重新確認，不自動送。
      if (driftRef.current && driftRef.current.removed.length > 0) return;

      const batches = plan.groups.flatMap((group) =>
        group.blocked ? [] : group.batches.map((batch) => ({ platformCode: group.platformCode, routeId: group.routeId, orderNos: batch.orderNos })),
      );

      setState((prev) => ({ ...prev, phase: "RUNNING", error: null, progress: { completedBatches: 0, totalBatches: batches.length } }));

      const allResults: ShipmentOrderResult[] = [];
      const allDocuments: ShipmentBatchResult["documents"] = [];

      for (const batch of batches) {
        if (!mounted.current || gen !== generation.current) return;
        let batchResult: ShipmentBatchResult;
        try {
          batchResult = await executeShipmentBatch({ dateRange, ...batch });
        } catch (err) {
          // executeShipmentBatch 已經把 connector throw 轉成 FAILED，這裡防禦性地再擋一次
          // （例如呼叫本身的網路錯誤），確保單一批次失敗不會讓後面的批次跟著中斷。
          batchResult = {
            routeId: batch.routeId,
            results: batch.orderNos.map((orderNo) => ({ orderNo, state: "FAILED", message: errorMessage(err, "批次執行失敗") })),
            documents: [],
          };
        }
        if (!mounted.current || gen !== generation.current) return;

        allResults.push(...batchResult.results);
        allDocuments.push(...batchResult.documents);
        setState((prev) => ({
          ...prev,
          results: [...allResults],
          documents: [...allDocuments],
          progress: { completedBatches: prev.progress.completedBatches + 1, totalBatches: prev.progress.totalBatches },
        }));
      }

      if (!mounted.current || gen !== generation.current) return;
      setState((prev) => ({ ...prev, phase: "DONE" }));
      onFinished?.();
    },
    [onFinished],
  );

  const reset = useCallback(() => {
    generation.current += 1;
    planRef.current = null;
    driftRef.current = null;
    selectedIdsRef.current = undefined;
    setState(initialState);
  }, []);

  return { ...state, preview, refresh, confirm, run, reset };
}

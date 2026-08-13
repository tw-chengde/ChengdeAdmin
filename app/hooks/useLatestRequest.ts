import { useCallback, useEffect, useRef } from "react";

export interface LatestRequestHandlers<T> {
  onSuccess: (value: T) => void;
  onError: (error: unknown) => void;
  /** 成功與失敗都會呼叫；同樣只在這次仍是最新請求時執行。 */
  onSettled?: () => void;
}

/**
 * 讓非同步結果只有「最後一次發動的那次」會被採用。
 *
 * 平台查詢的耗時差距很大，使用者連續送出兩次查詢時，先送出的那次很可能後回來。
 * 若不做這個判斷，畫面會停在舊條件的結果上，而且看起來像是查詢壞掉。
 * 元件卸載後同樣不再寫入狀態。
 */
export function useLatestRequest() {
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(<T,>(task: () => Promise<T>, handlers: LatestRequestHandlers<T>) => {
    const id = ++requestId.current;
    const isCurrent = () => mounted.current && id === requestId.current;

    void task().then(
      (value) => {
        if (!isCurrent()) return;
        handlers.onSuccess(value);
        handlers.onSettled?.();
      },
      (error: unknown) => {
        if (!isCurrent()) return;
        handlers.onError(error);
        handlers.onSettled?.();
      },
    );
  }, []);
}

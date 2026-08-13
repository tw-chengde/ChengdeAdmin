import { useCallback, useState, useTransition } from "react";

export interface MutationDialog<T> {
  /** 正在處理的對象；null 代表對話框關閉。 */
  target: T | null;
  error: string | null;
  setError: (message: string | null) => void;
  /** 送出中。此時取消與關閉都會被擋下，避免動作進行到一半被關掉。 */
  pending: boolean;
  open: (target: T) => void;
  close: () => void;
  /** 送出並在成功時自動關閉；回傳 { ok, error } 形式的 server action 結果。 */
  submit: (action: () => Promise<{ ok: boolean; error?: string }>, fallbackMessage: string) => void;
}

/**
 * 「開啟對話框 → 送出 → 成功關閉／失敗就地顯示錯誤」這個流程的共用狀態。
 *
 * 商品的新增／修改／刪除與併單的綁定／解綁都是同一套，各自實作時很容易漏掉
 * 送出中的鎖定，或忘記在重新開啟時清掉上一次的錯誤訊息。
 */
export function useMutationDialog<T>(onSuccess?: () => void): MutationDialog<T> {
  const [target, setTarget] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = useCallback((next: T) => {
    setTarget(next);
    setError(null);
  }, []);

  const close = useCallback(() => {
    if (pending) return;
    setTarget(null);
    setError(null);
  }, [pending]);

  const submit = useCallback(
    (action: () => Promise<{ ok: boolean; error?: string }>, fallbackMessage: string) => {
      setError(null);
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          setTarget(null);
          onSuccess?.();
        } else {
          setError(result.error ?? fallbackMessage);
        }
      });
    },
    [onSuccess],
  );

  return { target, error, setError, pending, open, close, submit };
}

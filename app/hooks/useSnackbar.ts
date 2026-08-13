import { useCallback, useState } from "react";

export type SnackbarSeverity = "success" | "info";

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

/**
 * 操作成功後的提示訊息。
 *
 * 關閉時只把 open 設為 false、保留訊息內容，讓 MUI Snackbar 的淡出動畫
 * 不會在文字先消失的情況下播放。
 */
export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: "", severity: "success" });

  const notify = useCallback((message: string, severity: SnackbarSeverity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const close = useCallback(() => setSnackbar((prev) => ({ ...prev, open: false })), []);

  return { snackbar, notify, close };
}

import type { PlatformCode } from "@/app/lib/platforms/types";

/** 平台在畫面上顯示所需的完整狀態：registry 的顯示資料 + D1 的啟用狀態。 */
export interface PlatformStatus {
  code: PlatformCode;
  name: string;
  logo: string;
  enabled: boolean;
}

/** 切換啟用狀態的結果型別。失敗時 error 為可直接顯示的中文訊息。 */
export interface PlatformMutationResult {
  ok: boolean;
  error?: string;
}

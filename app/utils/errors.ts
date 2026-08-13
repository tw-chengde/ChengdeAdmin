/**
 * 把 catch 到的未知值轉成可以顯示的訊息。
 *
 * 只有 Error 的 message 值得直接顯示；其他型別（字串、物件、undefined）都可能是
 * 內部細節或空值，一律換成呼叫端提供的中文說明。
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

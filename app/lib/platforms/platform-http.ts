/**
 * 平台 API 共用的 HTTP 傳輸。
 *
 * momo SCM 與 mo店+ 的端點都是「POST JSON、回 JSON」，錯誤處理也一致：
 * 先讀成文字再解析，這樣非 JSON 的錯誤頁也能被截一段放進錯誤訊息。
 * 回應內容一律截斷至 300 字，避免把整頁 HTML 或使用者資料寫進 log。
 */

const MAX_ERROR_BODY_LENGTH = 300;

export interface PostJsonOptions {
  url: string;
  headers: Headers;
  body: unknown;
  /** 錯誤訊息前綴，例如 "momo SCM"、"mo店+ 訂單查詢"。 */
  label: string;
  fetchImpl: typeof fetch;
}

export async function postJson<T>({ url, headers, body, label, fetchImpl }: PostJsonOptions): Promise<T> {
  const response = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body) });
  const raw = await response.text();

  let payload: T | undefined;
  try {
    payload = JSON.parse(raw) as T;
  } catch {
    // 留給下方的錯誤處理；HTTP 狀態碼先報，才不會把「伺服器 500 回了 HTML」誤報成格式問題。
  }

  if (!response.ok) {
    throw new Error(`${label} HTTP ${response.status}：${raw.slice(0, MAX_ERROR_BODY_LENGTH) || "未提供錯誤內容"}`);
  }
  if (!payload) throw new Error(`${label}回傳非 JSON 格式資料。`);
  return payload;
}

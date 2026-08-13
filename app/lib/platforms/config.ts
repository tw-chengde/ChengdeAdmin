import type { PlatformProxyOptions } from "./platform-proxy";

/**
 * 平台整合的設定來源（伺服器端環境變數）。
 *
 * 集中在這裡而不是散落各 client，是為了讓「哪些變數必填、哪些選填、格式為何」
 * 只有一份定義可讀。client 與 connector 一律接收已解析好的設定物件，
 * 測試因此可以直接傳值，不必動到 process.env。
 */

/** 讀取選填變數；未設定或只有空白時回傳 undefined。 */
export function optionalEnvironment(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** 讀取必填變數；未設定時直接拋錯，而不是讓查詢在更深的地方失敗。 */
export function requiredEnvironment(name: string): string {
  const value = optionalEnvironment(name);
  if (!value) throw new Error(`缺少 ${name} 設定。請在伺服器端環境變數設定 momo SCM 憑證。`);
  return value;
}

/**
 * 讀取逗號分隔的列舉設定。未設定時代表「不限縮」，回傳全部允許值；
 * 設定了無法辨識的值就拋錯，避免安靜地少查一批訂單。
 */
export function allowedValuesFromEnvironment<T extends string>(name: string, allowedValues: readonly T[]): T[] {
  const configured = optionalEnvironment(name);
  if (!configured) return [...allowedValues];

  const values = [...new Set(configured.split(",").map((value) => value.trim()).filter(Boolean))];
  const invalidValues = values.filter((value) => !allowedValues.includes(value as T));
  if (invalidValues.length) {
    throw new Error(`${name} contains unsupported momo SCM values: ${invalidValues.join(", ")}`);
  }
  return values as T[];
}

export interface MomoScmCredentials {
  entpId: string;
  entpCode: string;
  entpPassword: string;
  otpBackNo: string;
}

/** momo SCM 的四項憑證皆為必填——少任何一項都無法通過 SCM 的登入檢查。 */
export function momoScmCredentialsFromEnvironment(): MomoScmCredentials {
  return {
    entpId: requiredEnvironment("MOMO_SCM_ENTP_ID"),
    entpCode: requiredEnvironment("MOMO_SCM_ENTP_CODE"),
    entpPassword: requiredEnvironment("MOMO_SCM_ENTP_PASSWORD"),
    otpBackNo: requiredEnvironment("MOMO_SCM_OTP_BACK_NO"),
  };
}

/** mo店+ 的授權標頭為選填：未設定時仍會送出請求，由平台端回覆授權失敗。 */
export function moStorePlusAuthValueFromEnvironment(): string | undefined {
  return optionalEnvironment("MO_STORE_PLUS_AUTH_VALUE");
}

/** momo 與 mo店+ 都要求供應商固定出口 IP，兩者共用同一組 MOMO_PROXY_* 設定。 */
export function platformProxyFromEnvironment(): PlatformProxyOptions {
  return { proxyUrl: process.env.MOMO_PROXY_URL, proxyToken: process.env.MOMO_PROXY_TOKEN };
}

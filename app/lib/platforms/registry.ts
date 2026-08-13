import type { PlatformConnector } from "./connector";
import type { PlatformCode } from "./types";
import { momoConnector } from "./momo";
import { moStorePlusConnector } from "./mo-store-plus";

/**
 * 所有已知的平台連接器。新增平台時在這裡加入一筆，
 * 並在 definitions.ts 補上對應的顯示定義。
 *
 * 這個模組會拉進各平台的 API client（含憑證讀取），因此只能在伺服器端使用。
 * client component 需要平台名稱、顏色等顯示資料時請改用 definitions.ts。
 */
const connectors: PlatformConnector[] = [momoConnector, moStorePlusConnector];

export function getConnector(code: PlatformCode): PlatformConnector | undefined {
  return connectors.find((c) => c.definition.code === code);
}

/** 依目前啟用的平台代碼，回傳對應的連接器（保留 registry 中的原始順序）。 */
export function getEnabledConnectors(enabledCodes: PlatformCode[]): PlatformConnector[] {
  const enabled = new Set(enabledCodes);
  return connectors.filter((c) => enabled.has(c.definition.code));
}

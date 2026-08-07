import type { PlatformConnector } from "./connector";
import type { PlatformCode, PlatformDefinition } from "./types";
import { momoConnector } from "./momo";
import { moStorePlusConnector } from "./mo-store-plus";

/** 所有已知的平台連接器。新增平台時在這裡加入一筆。順序即畫面上分頁預設的排列順序。 */
const connectors: PlatformConnector[] = [momoConnector, moStorePlusConnector];

export function getConnector(code: PlatformCode): PlatformConnector | undefined {
  return connectors.find((c) => c.definition.code === code);
}

/** 回傳所有平台的顯示中繼資料，不受啟用狀態影響（設定頁需要列出全部平台）。 */
export function getAllPlatformDefinitions(): PlatformDefinition[] {
  return connectors.map((c) => c.definition);
}

/** 依目前啟用的平台代碼，回傳對應的連接器（保留 registry 中的原始順序）。 */
export function getEnabledConnectors(enabledCodes: PlatformCode[]): PlatformConnector[] {
  const enabled = new Set(enabledCodes);
  return connectors.filter((c) => enabled.has(c.definition.code));
}

import type { PlatformDefinition } from "@/app/lib/platforms/types";
import type { PlatformStatus } from "@/app/types/platform";

/**
 * 合併 registry 的顯示資料與 D1 的啟用狀態。
 * D1 尚未有資料列的平台預設視為「已啟用」，確保漏建種子資料或新平台的 connector
 * 已上線但資料列還沒建立時，行為與導入此功能前完全一致（所有平台預設開啟）。
 */
export function mergePlatformStatuses(
  definitions: PlatformDefinition[],
  dbRows: { code: string; enabled: boolean }[],
): PlatformStatus[] {
  const disabled = new Set(dbRows.filter((r) => !r.enabled).map((r) => r.code));
  return definitions.map((def) => ({
    code: def.code,
    name: def.name,
    logo: def.logo,
    enabled: !disabled.has(def.code),
  }));
}

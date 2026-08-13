"use server";

import { sql } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { platforms } from "@/app/lib/schema";
import { getAllPlatformDefinitions } from "@/app/lib/platforms/definitions";
import type { PlatformCode } from "@/app/lib/platforms/types";
import type { PlatformMutationResult, PlatformStatus } from "@/app/types/platform";
import { mergePlatformStatuses } from "@/app/utils/platforms";

/** 讀取所有平台的啟用狀態，供設定頁與訂單頁共用。 */
export async function listPlatformStatuses(): Promise<PlatformStatus[]> {
  const db = getDb();
  const rows = await db.select({ code: platforms.code, enabled: platforms.enabled }).from(platforms);
  return mergePlatformStatuses(getAllPlatformDefinitions(), rows);
}

/** 只回傳目前啟用中的平台代碼，訂單頁抓單時使用。 */
export async function listEnabledPlatformCodes(): Promise<PlatformCode[]> {
  const statuses = await listPlatformStatuses();
  return statuses.filter((s) => s.enabled).map((s) => s.code);
}

/** 切換平台啟用狀態；該平台尚未有資料列時自動新增一筆（upsert）。 */
export async function setPlatformEnabled(code: PlatformCode, enabled: boolean): Promise<PlatformMutationResult> {
  try {
    const db = getDb();
    await db
      .insert(platforms)
      .values({ code, enabled })
      .onConflictDoUpdate({ target: platforms.code, set: { enabled, updatedAt: sql`datetime('now')` } })
      .run();
    return { ok: true };
  } catch {
    return { ok: false, error: "更新平台狀態失敗，請稍後再試" };
  }
}

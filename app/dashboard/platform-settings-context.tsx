"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAllPlatformDefinitions } from "@/app/lib/platforms/definitions";
import type { PlatformCode, PlatformDefinition } from "@/app/lib/platforms/types";
import type { PlatformMutationResult, PlatformStatus } from "@/app/types/platform";
import LoadingBackdrop from "./loading-backdrop";
import { listPlatformStatuses, setPlatformEnabled } from "./platforms-actions";

interface PlatformSettingsContextValue {
  statuses: PlatformStatus[];
  enabledPlatforms: PlatformDefinition[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggle: (code: PlatformCode, enabled: boolean) => Promise<PlatformMutationResult>;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextValue | null>(null);

/** 平台開關狀態的單一來源，掛在 dashboard 最上層；訂單頁、併單管理頁、設定頁都從這裡讀取，
 *  避免每個頁面各自打一次 D1、切換分頁時狀態互相不同步。 */
export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<PlatformStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await listPlatformStatuses();
      setStatuses(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入平台設定失敗");
    }
  }, []);

  useEffect(() => {
    let active = true;
    listPlatformStatuses()
      .then((rows) => {
        if (active) setStatuses(rows);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "載入平台設定失敗");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(async (code: PlatformCode, enabled: boolean) => {
    const result = await setPlatformEnabled(code, enabled);
    if (result.ok) {
      setStatuses((prev) => prev.map((s) => (s.code === code ? { ...s, enabled } : s)));
    }
    return result;
  }, []);

  const enabledPlatforms = useMemo(() => {
    const enabledCodes = new Set(statuses.filter((s) => s.enabled).map((s) => s.code));
    return getAllPlatformDefinitions().filter((d) => enabledCodes.has(d.code));
  }, [statuses]);

  const value = useMemo(
    () => ({ statuses, enabledPlatforms, loading, error, refresh, toggle }),
    [statuses, enabledPlatforms, loading, error, refresh, toggle],
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
      <LoadingBackdrop open={loading} message="正在載入平台設定，請稍候..." />
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings(): PlatformSettingsContextValue {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) throw new Error("usePlatformSettings 必須在 PlatformSettingsProvider 內使用");
  return ctx;
}

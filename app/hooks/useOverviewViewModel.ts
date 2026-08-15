import { useCallback, useEffect, useState } from "react";
import { loadOverviewData } from "@/app/dashboard/overview-actions";
import type { OverviewMetrics } from "@/app/utils/overview";
import { errorMessage } from "@/app/utils/errors";

export function useOverviewViewModel() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadOverviewData();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(errorMessage(err, "載入營運總覽資料失敗"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadOverviewData()
      .then((data) => {
        if (active) {
          setMetrics(data);
          setLastUpdated(new Date());
        }
      })
      .catch((err) => {
        if (active) {
          setError(errorMessage(err, "載入營運總覽資料失敗"));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    reload,
  };
}

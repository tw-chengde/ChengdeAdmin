"use client";

import ListAltRounded from "@mui/icons-material/ListAltRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import { Alert, Badge, Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import type { PlatformCode } from "@/app/lib/platforms/types";
import type { ShipmentPlan } from "@/app/types/shipment";
import { useOneClickShipment } from "@/app/hooks/useOneClickShipment";
import { useShippingWorkspace } from "@/app/hooks/useShippingWorkspace";
import { getMaxEndDate } from "@/app/utils/orders";
import LoadingBackdrop from "./loading-backdrop";
import PickingSheetDialog from "./picking-sheet-dialog";
import PlatformShippingPanel from "./platform-shipping-panel";
import { usePlatformSettings } from "./platform-settings-context";
import ShippingDispatchDialog from "./shipping-dispatch-dialog";

export default function ShippingView() {
  const { enabledPlatforms } = usePlatformSettings();
  const { dateRange, setDateRange, workspace, pickingSheet, loading, hasLoaded, loadError, refresh } = useShippingWorkspace();
  const [pickingSheetOpen, setPickingSheetOpen] = useState(false);
  const [panelRefreshToken, setPanelRefreshToken] = useState(0);
  const [selectedPlatformCode, setSelectedPlatformCode] = useState<PlatformCode | null>(null);
  const [shipmentCounts, setShipmentCounts] = useState<Partial<Record<PlatformCode, number>>>({});
  const dispatch = useOneClickShipment(() => {
    refresh();
    setPanelRefreshToken((token) => token + 1);
  });

  const activePlatformCode = enabledPlatforms.some((platform) => platform.code === selectedPlatformCode)
    ? selectedPlatformCode
    : (enabledPlatforms[0]?.code ?? null);

  const handlePlanChange = useCallback((plan: ShipmentPlan) => {
    const counts = plan.groups.reduce<Partial<Record<PlatformCode, number>>>((result, group) => {
      result[group.platformCode] = (result[group.platformCode] ?? 0) + group.orders.length;
      return result;
    }, {});
    setShipmentCounts(counts);
  }, []);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 3 }}
      >
        <Box>
          <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 28 }, fontWeight: 850, letterSpacing: "-.03em" }}>
            出貨管理
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
            管理各通路待發貨訂單、列印揀貨單與執行出貨作業。
          </Typography>
        </Box>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}

      {workspace.failures.map((failure) => {
        const platform = enabledPlatforms.find((item) => item.code === failure.platformCode);
        return (
          <Alert severity="warning" sx={{ mb: 3 }} key={failure.platformCode}>
            {platform?.name ?? failure.platformCode} 訂單查詢失敗：{failure.message}，其他平台仍可正常作業。
          </Alert>
        );
      })}

      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, p: 2.5, mb: 3 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { lg: "center" } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="開始日期"
              type="date"
              size="small"
              value={dateRange.startDate}
              onChange={(event) => {
                const startDate = event.target.value;
                setDateRange({
                  startDate,
                  endDate: dateRange.endDate < startDate ? startDate : dateRange.endDate,
                });
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: { xs: "100%", sm: 150 } }}
            />
            <TextField
              label="結束日期"
              type="date"
              size="small"
              value={dateRange.endDate}
              onChange={(event) => setDateRange({ ...dateRange, endDate: event.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dateRange.startDate, max: getMaxEndDate(dateRange.startDate) } }}
              sx={{ width: { xs: "100%", sm: 150 } }}
            />
            <Button
              variant="outlined"
              startIcon={<RefreshRounded />}
              onClick={() => {
                refresh();
                setPanelRefreshToken((token) => token + 1);
              }}
              disabled={loading}
            >
              查詢待出貨訂單
            </Button>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Badge badgeContent={pickingSheet.totals.totalQty} color="primary" max={999} showZero={false}>
              <Button variant="outlined" startIcon={<ListAltRounded />} onClick={() => setPickingSheetOpen(true)} disabled={!hasLoaded}>
                跨平台揀貨單
              </Button>
            </Badge>
            <Button variant="contained" startIcon={<RocketLaunchRounded />} onClick={() => dispatch.preview(dateRange)}>
              跨平台一鍵出貨
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {hasLoaded && workspace.orders.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          查詢區間內沒有訂單。
        </Alert>
      )}

      {enabledPlatforms.length > 0 && (
        <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, mb: 3, p: 0.8, bgcolor: "#ffffff" }}>
          <Tabs
            value={activePlatformCode ?? false}
            onChange={(_, platformCode: PlatformCode) => setSelectedPlatformCode(platformCode)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="E-commerce platform"
            sx={{
              minHeight: 48,
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                bgcolor: enabledPlatforms.find((platform) => platform.code === activePlatformCode)?.color ?? "#2563eb",
              },
            }}
          >
            {enabledPlatforms.map((platform) => {
              const orderCount = shipmentCounts[platform.code] ?? 0;
              return (
                <Tab
                  key={platform.code}
                  value={platform.code}
                  label={
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Box
                        component="img"
                        src={platform.logo}
                        alt={platform.name}
                        sx={{ width: 22, height: 22, borderRadius: "4px", objectFit: platform.logoObjectFit }}
                      />
                      <Typography sx={{ fontWeight: 750, fontSize: 14 }}>{`${platform.name} (${orderCount})`}</Typography>
                    </Stack>
                  }
                  sx={{ px: 2.5, py: 1.2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: platform.color } }}
                />
              );
            })}
          </Tabs>
        </Paper>
      )}

      <PlatformShippingPanel
        dateRange={dateRange}
        refreshToken={panelRefreshToken}
        platformCode={activePlatformCode ?? undefined}
        onPlanChange={handlePlanChange}
        onDispatch={(selectedIds) => dispatch.preview(dateRange, selectedIds)}
      />

      <PickingSheetDialog open={pickingSheetOpen} onClose={() => setPickingSheetOpen(false)} sheet={pickingSheet} />
      <ShippingDispatchDialog dispatch={dispatch} dateRange={dateRange} onClose={() => setPanelRefreshToken((token) => token + 1)} />

      <LoadingBackdrop open={loading} message="正在載入出貨資料，請稍候..." />
    </Box>
  );
}

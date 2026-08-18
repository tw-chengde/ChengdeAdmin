"use client";

import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { PlatformCode } from "@/app/lib/platforms/types";
import type { ShipmentCandidate, ShipmentPlan } from "@/app/types/shipment";
import type { OrderDateRange } from "@/app/utils/orders";
import { previewShipmentPlan } from "./shipping-actions";
import { headCell } from "./table-styles";

interface PlatformShippingPanelProps {
  dateRange: OrderDateRange;
  /** Limit the route workspace to the platform selected in the level-one tabs. */
  platformCode?: PlatformCode;
  /** Reports the full plan so the parent can show accurate platform-level counts. */
  onPlanChange?: (plan: ShipmentPlan) => void;
  /** 值改變時重新載入候選訂單（例如一鍵出貨完成後）。 */
  refreshToken: number;
  /** 開啟出貨派工對話框，帶入要出貨的候選訂單 id。 */
  onDispatch: (selectedIds: string[]) => void;
}

/**
 * 依出貨路徑分組瀏覽候選訂單，支援「單通路批次出貨」。
 *
 * 資料來源與出貨派工對話框各自獨立呼叫 `previewShipmentPlan`——瀏覽用的清單
 * 不必和對話框內部的預覽/確認週期綁在一起，對話框開啟時仍會自己重新查一次。
 */
export default function PlatformShippingPanel({ dateRange, refreshToken, platformCode, onPlanChange, onDispatch }: PlatformShippingPanelProps) {
  const [plan, setPlan] = useState<ShipmentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedByRoute, setSelectedByRoute] = useState<Record<string, Set<string>>>({});
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const loadedRefreshToken = useRef<number | null>(null);

  const platformGroups = plan?.groups.filter((group) => !platformCode || group.platformCode === platformCode) ?? [];
  const activeRouteId = platformGroups.some((group) => group.routeId === selectedRouteId)
    ? selectedRouteId
    : (platformGroups[0]?.routeId ?? null);

  // 重新查詢時沿用畫面上既有的資料，直到新結果回來才整批換掉，不閃回載入畫面。
  useEffect(() => {
    if (refreshToken === 0 || loadedRefreshToken.current === refreshToken) return;
    loadedRefreshToken.current = refreshToken;
    let active = true;
    setLoading(true);
    previewShipmentPlan(dateRange).then(
      (data) => {
        if (!active) return;
        setPlan(data);
        onPlanChange?.(data);
        setLoadError(null);
        setSelectedByRoute({});
        setLoading(false);
      },
      (error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "載入候選訂單失敗");
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [dateRange, onPlanChange, refreshToken]);

  const toggleOrder = (routeId: string, orderId: string) => {
    setSelectedByRoute((prev) => {
      const current = new Set(prev[routeId] ?? []);
      if (current.has(orderId)) current.delete(orderId);
      else current.add(orderId);
      return { ...prev, [routeId]: current };
    });
  };

  const toggleAll = (routeId: string, orders: ShipmentCandidate[]) => {
    setSelectedByRoute((prev) => {
      const current = prev[routeId] ?? new Set<string>();
      const allSelected = orders.length > 0 && orders.every((order) => current.has(order.id));
      return { ...prev, [routeId]: allSelected ? new Set() : new Set(orders.map((order) => order.id)) };
    });
  };

  if (loading) {
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 4 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">正在載入候選訂單…</Typography>
      </Stack>
    );
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (!plan) {
    return (
      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, p: 6, textAlign: "center", bgcolor: "#ffffff" }}>
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
          沒有待出貨訂單
        </Typography>
      </Paper>
    );
  }

  if (platformGroups.length === 0) {
    return (
      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, p: 6, textAlign: "center", bgcolor: "#ffffff" }}>
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
          沒有待出貨訂單
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
      {plan.warnings
        .filter((warning) => warning.scope === "PLATFORM" && (!platformCode || warning.platformCode === platformCode))
        .map((warning, index) => (
          <Alert severity="warning" key={`${warning.platformCode}:${warning.routeId}:${index}`}>
            {warning.message}
          </Alert>
        ))}
      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, p: 0.8, bgcolor: "#ffffff" }}>
        <Tabs
          value={activeRouteId ?? false}
          onChange={(_, routeId: string) => setSelectedRouteId(routeId)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Shipping route"
          sx={{
            minHeight: 48,
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", bgcolor: "#2563eb" },
          }}
        >
          {platformGroups.map((group) => (
            <Tab
              key={group.routeId}
              value={group.routeId}
              label={`${group.routeLabel} (${group.orders.length})`}
              sx={{ px: 2.5, py: 1.2, textTransform: "none", fontWeight: 750, color: "#64748b", "&.Mui-selected": { color: "#175cd3" } }}
            />
          ))}
        </Tabs>
      </Paper>

      {platformGroups.filter((group) => group.routeId === activeRouteId).map((group) => {
        const selected = selectedByRoute[group.routeId] ?? new Set<string>();
        const allSelected = group.orders.length > 0 && group.orders.every((order) => selected.has(order.id));

        return (
          <Accordion key={`${group.platformCode}:${group.routeId}`} defaultExpanded disableGutters sx={{ border: "1px solid #eaecf0", borderRadius: "12px !important", "&::before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreRounded />}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: "100%", pr: 1 }}>
                <Typography sx={{ fontWeight: 750, flex: 1 }}>{group.routeLabel}</Typography>
                {group.blocked ? (
                  <Chip label="包材尚未設定" color="warning" size="small" />
                ) : (
                  <Chip label={`${group.orders.length} 筆可出貨`} size="small" sx={{ bgcolor: "#eff8ff", color: "#175cd3", fontWeight: 700 }} />
                )}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={selected.size > 0 && !allSelected}
                      onChange={() => toggleAll(group.routeId, group.orders)}
                      disabled={Boolean(group.blocked)}
                    />
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>全選本通路（{group.orders.length} 筆）</Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={Boolean(group.blocked) || selected.size === 0}
                    onClick={() => onDispatch([...selected])}
                  >
                    {`批次出貨（${selected.size}）`}
                  </Button>
                </Stack>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell sx={headCell}>訂單編號</TableCell>
                      <TableCell sx={headCell}>收件人</TableCell>
                      <TableCell sx={headCell}>訂購商品</TableCell>
                      <TableCell sx={headCell} align="right">數量</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.orders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={selected.has(order.id)} onChange={() => toggleOrder(group.routeId, order.id)} disabled={Boolean(group.blocked)} />
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: 12.5 }}>{order.orderNo}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{order.receiverName || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 12.5, maxWidth: 260 }}>
                          <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {order.items[0]?.name ?? "—"}
                            {order.items.length > 1 && ` 等 ${order.items.length} 項`}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12.5 }}>{order.totalQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

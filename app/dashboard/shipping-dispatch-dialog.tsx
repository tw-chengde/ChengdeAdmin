"use client";

import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import FileDownloadRounded from "@mui/icons-material/FileDownloadRounded";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { useOneClickShipment } from "@/app/hooks/useOneClickShipment";
import type { ShipmentOrderState } from "@/app/types/shipment";
import { downloadShipmentDocument } from "@/app/utils/downloads";
import { shipmentResultMessage } from "@/app/utils/shipment";
import type { OrderDateRange } from "@/app/utils/orders";
import { headCell } from "./table-styles";

interface ShippingDispatchDialogProps {
  dispatch: ReturnType<typeof useOneClickShipment>;
  dateRange: OrderDateRange;
  onClose: () => void;
}

const stateLabel: Record<ShipmentOrderState, string> = {
  SUCCESS: "成功",
  ALREADY_DONE: "已出貨（重複）",
  FAILED: "失敗",
  SKIPPED: "略過",
};

const stateColor: Record<ShipmentOrderState, "success" | "error" | "default"> = {
  SUCCESS: "success",
  ALREADY_DONE: "success",
  FAILED: "error",
  SKIPPED: "default",
};

/**
 * 出貨派工對話框：全量 / 單通路 / 單筆出貨共用同一個元件，差別只在開啟時
 * `dispatch.preview(dateRange, selectedIds)` 傳入的候選訂單範圍不同（呼叫端決定）。
 */
export default function ShippingDispatchDialog({ dispatch, dateRange, onClose }: ShippingDispatchDialogProps) {
  // 預覽失敗時 phase 會被重置回 IDLE（見 useOneClickShipment），若只看 phase 對話框會在
  // 錯誤訊息顯示前就先關閉，因此開啟狀態也要看 error。
  const open = dispatch.phase !== "IDLE" || Boolean(dispatch.error);
  // confirm() 完成前 phase 仍是 AWAITING_CONFIRM，按鈕不會自動失效；
  // 這面旗標擋掉雙擊/連點造成的重複 confirm+run（進而重複觸發平台出貨確認 API）。
  const [submitting, setSubmitting] = useState(false);

  const stateCounts = useMemo(() => {
    const counts: Record<ShipmentOrderState, number> = { SUCCESS: 0, ALREADY_DONE: 0, FAILED: 0, SKIPPED: 0 };
    for (const result of dispatch.results) counts[result.state] += 1;
    return counts;
  }, [dispatch.results]);

  if (!open) return null;

  const handleClose = () => {
    if (dispatch.phase === "RUNNING" || submitting) return; // 執行中不能關閉，避免中途跳出誤以為已中斷。
    dispatch.reset();
    onClose();
  };

  const handlePrimaryAction = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const drift = await dispatch.confirm(dateRange);
      // drift.removed 非空要停下來要求重新確認，不自動送；為 null 代表確認本身失敗，同樣不送。
      if (drift && drift.removed.length === 0) await dispatch.run(dateRange);
    } finally {
      setSubmitting(false);
    }
  };

  const plan = dispatch.plan;
  const hasStaleOrders = Boolean(dispatch.drift && dispatch.drift.removed.length > 0);
  const progressPercent = dispatch.progress.totalBatches
    ? Math.round((dispatch.progress.completedBatches / dispatch.progress.totalBatches) * 100)
    : 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 850 }}>⚡ 一鍵出貨</DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 3 }}>
        {dispatch.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {dispatch.error}
          </Alert>
        )}

        {dispatch.phase === "PREVIEWING" && (
          <Stack spacing={2} sx={{ alignItems: "center", py: 6 }}>
            <CircularProgress />
            <Typography color="text.secondary">正在彙整候選訂單…</Typography>
          </Stack>
        )}

        {dispatch.phase === "AWAITING_CONFIRM" && plan && (
          <Stack spacing={2}>
            {hasStaleOrders && (
              <Alert severity="warning">
                有 {dispatch.drift?.removed.length} 筆訂單在預覽後已消失（可能已被平台取消或出貨完成），請重新整理候選清單。
              </Alert>
            )}
            {dispatch.drift && dispatch.drift.added.length > 0 && (
              <Alert severity="info">預覽後又新增了 {dispatch.drift.added.length} 筆訂單，不會自動納入本次出貨。</Alert>
            )}
            {plan.warnings.map((warning, index) => (
              <Alert severity="warning" key={`${warning.routeId}-${index}`}>
                {warning.message}
              </Alert>
            ))}

            {plan.groups.length === 0 ? (
              <Typography color="text.secondary">目前沒有可出貨的候選訂單。</Typography>
            ) : (
              plan.groups.map((group) => (
                <Paper key={`${group.platformCode}:${group.routeId}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontWeight: 750 }}>{group.routeLabel}</Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                      {group.orders.length} 筆可出貨
                    </Typography>
                  </Stack>
                  {group.blocked ? (
                    <Chip label="包材尚未設定，需人工處理" color="warning" size="small" sx={{ mt: 1 }} />
                  ) : (
                    <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.5 }}>
                      說明：{group.steps.map((step) => step.label).join(" → ") || "出貨確認"}
                    </Typography>
                  )}
                </Paper>
              ))
            )}

            <Typography sx={{ fontWeight: 750 }}>
              共 {plan.totals.automatableOrderCount} 筆將送出
              {plan.totals.orderCount > plan.totals.automatableOrderCount &&
                `，${plan.totals.orderCount - plan.totals.automatableOrderCount} 筆需人工處理`}
            </Typography>
          </Stack>
        )}

        {dispatch.phase === "RUNNING" && (
          <Stack spacing={2} sx={{ py: 2 }}>
            <Typography>
              執行中：{dispatch.progress.completedBatches} / {dispatch.progress.totalBatches} 批
            </Typography>
            <LinearProgress variant="determinate" value={progressPercent} />
          </Stack>
        )}

        {dispatch.phase === "DONE" && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              {(Object.keys(stateLabel) as ShipmentOrderState[]).map((state) => (
                <Chip
                  key={state}
                  label={`${stateLabel[state]} ${stateCounts[state]}`}
                  color={stateColor[state]}
                  variant={stateColor[state] === "default" ? "outlined" : "filled"}
                />
              ))}
            </Stack>

            {dispatch.documents.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {dispatch.documents.map((document, index) => (
                  <Button
                    key={`${document.name}-${index}`}
                    size="small"
                    variant="outlined"
                    startIcon={<FileDownloadRounded />}
                    onClick={() => downloadShipmentDocument(document)}
                  >
                    下載 {document.name}
                  </Button>
                ))}
              </Stack>
            )}

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headCell}>訂單編號</TableCell>
                  <TableCell sx={headCell}>狀態</TableCell>
                  <TableCell sx={headCell}>物流單號</TableCell>
                  <TableCell sx={headCell}>訊息</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dispatch.results.map((result) => (
                  <TableRow key={result.orderNo}>
                    <TableCell sx={{ fontFamily: "monospace" }}>{result.orderNo}</TableCell>
                    <TableCell>
                      <Chip size="small" label={stateLabel[result.state]} color={stateColor[result.state]} />
                    </TableCell>
                    <TableCell>{result.trackingNo ?? "—"}</TableCell>
                    <TableCell>{shipmentResultMessage(result.state, result.message)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, borderTop: "1px solid #eaecf0" }}>
        <Button onClick={handleClose} disabled={dispatch.phase === "RUNNING" || submitting}>
          {dispatch.phase === "DONE" ? "完成並關閉" : "取消"}
        </Button>
        {dispatch.phase === "AWAITING_CONFIRM" &&
          plan &&
          (hasStaleOrders ? (
            <Button variant="contained" onClick={() => dispatch.refresh(dateRange)}>
              重新整理候選清單
            </Button>
          ) : (
            plan.totals.automatableOrderCount > 0 && (
              <Button variant="contained" startIcon={<RocketLaunchRounded />} onClick={handlePrimaryAction} disabled={submitting}>
                開始批次出貨（{plan.totals.automatableOrderCount}）
              </Button>
            )
          ))}
      </DialogActions>
    </Dialog>
  );
}

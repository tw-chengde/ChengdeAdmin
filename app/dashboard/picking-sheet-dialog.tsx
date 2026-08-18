"use client";

import PrintRounded from "@mui/icons-material/PrintRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { PickingGroup, PickingSheet } from "@/app/types/picking";
import { productLabel } from "@/app/utils/product-bindings";
import PickingSheetPrintView from "./picking-sheet-print-view";
import { headCell } from "./table-styles";

interface PickingSheetDialogProps {
  open: boolean;
  onClose: () => void;
  sheet: PickingSheet;
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #eee5e1", borderRadius: 3, bgcolor: "white" }}>
      <Typography color="text.secondary" sx={{ fontSize: 12.5, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 800, mt: 0.6, color }}>{value}</Typography>
    </Paper>
  );
}

function matchesKeyword(group: PickingGroup, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  const productName = group.product ? productLabel(group.product) : group.fallbackName;
  if (productName.toLowerCase().includes(needle)) return true;
  return group.lines.some(
    (line) =>
      line.platformName.toLowerCase().includes(needle) ||
      (line.goodsCode ?? "").toLowerCase().includes(needle) ||
      line.spec.toLowerCase().includes(needle),
  );
}

/** 跨平台揀貨單對話框：彙總所有平台待發貨訂單，供檢視與列印。 */
const printTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getPickingSheetFileName(date = new Date()): string {
  const parts = printTimeFormatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const dateStr = `${getPart("year")}${getPart("month")}${getPart("day")}_${getPart("hour")}${getPart("minute")}`;
  return `跨平台出貨總揀單_${dateStr}`;
}

export default function PickingSheetDialog({ open, onClose, sheet }: PickingSheetDialogProps) {
  const [keyword, setKeyword] = useState("");
  const [unboundOnly, setUnboundOnly] = useState(false);

  const visibleGroups = useMemo(
    () =>
      sheet.groups.filter((group) => {
        if (unboundOnly && group.product !== null) return false;
        return matchesKeyword(group, keyword);
      }),
    [sheet.groups, keyword, unboundOnly],
  );

  // 開啟對話框當下就固定列印時間，避免每次重新渲染都跳動。
  const printedAt = useMemo(() => (open ? printTimeFormatter.format(new Date()) : ""), [open]);

  const handlePrint = () => {
    const originalTitle = document.title;
    try {
      document.title = getPickingSheetFileName();
      window.print();
    } finally {
      document.title = originalTitle;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}>
      <DialogTitle className="no-print" sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 850 }}>跨平台出貨總揀單</Typography>
          <IconButton onClick={onClose} aria-label="關閉">
            <CloseRounded />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Divider className="no-print" />

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" }, gap: 1.5, mb: 2.5 }} className="no-print">
          <StatCard label="待揀品項組數" value={sheet.totals.groupCount} />
          <StatCard label="待揀總件數" value={sheet.totals.totalQty} />
          <StatCard label="關聯訂單數" value={sheet.totals.orderCount} />
          <StatCard label="未綁定商品" value={sheet.totals.unboundGroupCount} color={sheet.totals.unboundGroupCount > 0 ? "#b54708" : undefined} />
          <StatCard label="庫存不足" value={sheet.totals.shortageGroupCount} color={sheet.totals.shortageGroupCount > 0 ? "#b42318" : undefined} />
        </Box>

        {sheet.totals.unboundGroupCount > 0 && (
          <Alert severity="warning" className="no-print" sx={{ mb: 2.5 }}>
            偵測到 {sheet.totals.unboundGroupCount} 個平台商品尚未綁定本地商品，揀貨單僅能顯示平台原始品名。
            {" "}
            <Box component="a" href="/dashboard/merge" sx={{ fontWeight: 700, color: "inherit" }}>
              前往併單管理建立綁定
            </Box>
          </Alert>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} className="no-print" sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
            <TextField
              size="small"
              placeholder="搜尋商品編號 / 品名 / 規格"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded sx={{ color: "#98a2b3" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: 240 }}
            />
            <FormControlLabel
              control={<Checkbox checked={unboundOnly} onChange={(event) => setUnboundOnly(event.target.checked)} size="small" />}
              label="只看未綁定"
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" startIcon={<PrintRounded />} onClick={handlePrint}>
              列印揀貨單
            </Button>
          </Stack>
        </Stack>

        <TableContainer component={Paper} variant="outlined" className="no-print" data-testid="picking-onscreen-table" sx={{ borderRadius: 2 }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f9fafb" }}>
                <TableCell sx={headCell}>商品</TableCell>
                <TableCell sx={headCell}>平台</TableCell>
                <TableCell sx={headCell}>平台商品編號</TableCell>
                <TableCell sx={headCell}>規格</TableCell>
                <TableCell sx={headCell} align="right">數量</TableCell>
                <TableCell sx={headCell}>訂單編號</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      {sheet.groups.length === 0 ? "查詢區間內沒有待發貨訂單。" : "沒有符合篩選條件的品項。"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visibleGroups.map((group) => {
                  const productName = group.product ? productLabel(group.product) : group.fallbackName;
                  return group.lines.map((line, index) => (
                    <TableRow key={line.key} hover>
                      {index === 0 && (
                        <TableCell rowSpan={group.lines.length} sx={{ verticalAlign: "top" }}>
                          <Stack spacing={0.5}>
                            <Typography sx={{ fontSize: 13, fontWeight: 750, color: "#1e293b" }}>{productName}</Typography>
                            {group.product === null && (
                              <Chip
                                label={group.bindingOrphaned ? "綁定的商品已刪除" : "未綁定"}
                                size="small"
                                sx={{ width: "fit-content", fontSize: 11, fontWeight: 750, bgcolor: "#fef3f2", color: "#b42318" }}
                              />
                            )}
                            {group.shortage && (
                              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#b42318" }}>
                                庫存 {group.product?.stock} / 需 {group.totalQty}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      )}
                      <TableCell sx={{ fontSize: 12.5 }}>{line.channelName}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontFamily: "monospace" }}>{line.goodsCode ?? "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{line.spec || "—"}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700 }}>{line.totalQty}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontFamily: "monospace" }}>{line.orderNos.join("、")}</TableCell>
                    </TableRow>
                  ));
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <PickingSheetPrintView groups={visibleGroups} printedAt={printedAt} />
      </DialogContent>
    </Dialog>
  );
}

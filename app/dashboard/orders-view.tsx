"use client";

import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import PrintRounded from "@mui/icons-material/PrintRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import StorefrontRounded from "@mui/icons-material/StorefrontRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useOrdersViewModel } from "@/app/hooks/useOrdersViewModel";
import type { OrderItem } from "@/app/types/order";
import { channelStyle, statusStyle } from "@/app/utils/orders";
import { usePlatformSettings } from "./platform-settings-context";
import { loadOrdersPageData } from "./orders-actions";

export default function OrdersView() {
  const { enabledPlatforms } = usePlatformSettings();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchOrdersData = () => loadOrdersPageData().then((rows) => setOrders(rows));

  // Initial load. State is only updated from the async callbacks (not
  // synchronously in the effect body); `loading` already defaults to true.
  useEffect(() => {
    let active = true;
    loadOrdersPageData()
      .then((rows) => {
        if (active) setOrders(rows);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : "載入訂單失敗");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    fetchOrdersData()
      .catch((err) => setLoadError(err instanceof Error ? err.message : "載入訂單失敗"))
      .finally(() => setIsSyncing(false));
  };

  const {
    channelTab,
    setChannelTab,
    statusTab,
    setStatusTab,
    searchQuery,
    setSearchQuery,
    selectedOrder,
    setSelectedOrder,
    copiedText,
    filteredOrders,
    stats,
    copyToClipboard,
  } = useOrdersViewModel(orders);

  // 若目前選中的平台在最新載入結果中已不再啟用（例如被設定頁停用），重置回「全部」，
  // 避免 MUI Tabs 的 value 對不到任何 Tab。
  useEffect(() => {
    if (channelTab !== "ALL" && !enabledPlatforms.some((p) => p.code === channelTab)) {
      setChannelTab("ALL");
    }
  }, [channelTab, enabledPlatforms, setChannelTab]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 3 }}
      >
        <Box>
          <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 28 }, fontWeight: 850, letterSpacing: "-.03em" }}>
            訂單管理
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
            整合 MOMO 購物網與 Mo 店+ 直營賣場，即時處理出貨與退換貨申請。
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.2}>
          <Button
            variant="outlined"
            startIcon={<SyncRounded className={isSyncing ? "spin-animation" : ""} />}
            onClick={handleSync}
            disabled={isSyncing}
            sx={{ borderColor: "#d0d5dd", color: "#344054", bgcolor: "white" }}
          >
            {isSyncing ? "同步 API 中..." : "即時同步訂單"}
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadRounded />}
            sx={{
              background: "linear-gradient(145deg, #2563eb, #1d4ed8)",
              fontWeight: 700,
              px: 2.2,
            }}
          >
            匯出訂單報表
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          bgcolor: "#f8fafc",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: "#ecfdf5",
              color: "#059669",
            }}
          >
            <CheckCircleRounded fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 750, color: "#0f172a" }}>
              MOMO 電商串接狀態：運作正常
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#64748b" }}>
              MOMO 購物網 (API 2.0 連線) • Mo 店+ (自動接單伺服器) | 上次同步時間：2026-08-01 10:45:00
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Chip
            size="small"
            icon={<CheckCircleOutlineRounded sx={{ fontSize: "14px !important" }} />}
            label="MOMO 購物網 API: 綠燈"
            sx={{ bgcolor: "#fdf2f8", color: "#ec008c", border: "1px solid #fbcfe8", fontWeight: 700, fontSize: 11.5 }}
          />
          <Chip
            size="small"
            icon={<CheckCircleOutlineRounded sx={{ fontSize: "14px !important" }} />}
            label="Mo 店+ API: 綠燈"
            sx={{ bgcolor: "#fff7ed", color: "#ea580c", border: "1px solid #ffedd5", fontWeight: 700, fontSize: 11.5 }}
          />
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, mb: 3, p: 0.8, bgcolor: "#ffffff" }}>
        <Tabs
          value={channelTab}
          onChange={(_, val) => setChannelTab(val)}
          sx={{
            minHeight: 48,
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
              bgcolor: enabledPlatforms.find((p) => p.code === channelTab)?.color ?? "#2563eb",
            },
          }}
        >
          <Tab
            value="ALL"
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <StorefrontRounded fontSize="small" />
                <Typography sx={{ fontWeight: 750, fontSize: 14 }}>全部電商通路</Typography>
                <Chip label={orders.length} size="small" sx={{ bgcolor: "#f1f5f9", fontWeight: 800, fontSize: 11 }} />
              </Stack>
            }
            sx={{ px: 2.5, py: 1.2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#0f172a" } }}
          />
          {enabledPlatforms.map((platform) => (
            <Tab
              key={platform.code}
              value={platform.code}
              label={
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Box
                    component="img"
                    src={platform.logo}
                    alt={platform.name}
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "4px",
                      objectFit: platform.logoObjectFit,
                    }}
                  />
                  <Typography sx={{ fontWeight: 750, fontSize: 14 }}>{platform.name}</Typography>
                  <Chip
                    label={orders.filter((o) => o.channelCode === platform.code).length}
                    size="small"
                    sx={{ bgcolor: platform.bgcolor, color: platform.color, fontWeight: 800, fontSize: 11 }}
                  />
                </Stack>
              }
              sx={{ px: 2.5, py: 1.2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: platform.color } }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.25, mb: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #eaecf0", borderRadius: 3 }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            {channelTab === "ALL"
              ? "本月總訂單筆數"
              : `${enabledPlatforms.find((p) => p.code === channelTab)?.name ?? ""}筆數`}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 26, fontWeight: 850 }}>{stats.totalOrders} 筆</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.8 }}>
            較上季成長 <span style={{ color: "#027a48", fontWeight: 700 }}>+14.2%</span>
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #eaecf0", borderRadius: 3 }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            本月銷售總金額
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 26, fontWeight: 850 }}>NT$ {stats.totalRevenue.toLocaleString()}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.8 }}>
            平均客單價 <span style={{ color: "#2563eb", fontWeight: 700 }}>NT$ {stats.totalOrders ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString() : 0}</span>
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #eaecf0", borderRadius: 3, bgcolor: stats.pendingShipment > 0 ? "#fffcf5" : "white" }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            待處理出貨
          </Typography>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 850, color: stats.pendingShipment > 0 ? "#b54708" : "#101828" }}>
              {stats.pendingShipment} 筆
            </Typography>
            {stats.pendingShipment > 0 && (
              <Chip label="需今日發貨" size="small" sx={{ bgcolor: "#fffaeb", color: "#b54708", fontWeight: 750, fontSize: 11 }} />
            )}
          </Stack>
          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.8 }}>
            已包含 MOMO 專用出貨標籤準備
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #eaecf0", borderRadius: 3 }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            退換貨與取消申請
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 26, fontWeight: 850, color: stats.rmaCount > 0 ? "#b42318" : "#101828" }}>
            {stats.rmaCount} 筆
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.8 }}>
            退貨率維持良好 <span style={{ color: "#027a48", fontWeight: 700 }}>1.15%</span>
          </Typography>
        </Paper>
      </Box>

      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { md: "center" },
            p: 2.5,
            borderBottom: "1px solid #eaecf0",
          }}
        >
          <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap", gap: 0.8 }}>
            {[
              ["ALL", "全部狀態"],
              ["待發貨", "待發貨"],
              ["配送中", "配送中"],
              ["已完成", "已完成"],
              ["待付款", "待付款"],
              ["退貨申請", "退貨/取消"],
            ].map(([val, label]) => (
              <Chip
                key={val}
                label={label}
                onClick={() => setStatusTab(val)}
                variant={statusTab === val ? "filled" : "outlined"}
                sx={{
                  fontWeight: 700,
                  fontSize: 12.5,
                  borderRadius: 2,
                  px: 0.5,
                  bgcolor: statusTab === val ? "#1e293b" : "transparent",
                  color: statusTab === val ? "white" : "#64748b",
                  borderColor: statusTab === val ? "#1e293b" : "#cbd5e1",
                  "&:hover": { bgcolor: statusTab === val ? "#0f172a" : "#f1f5f9" },
                }}
              />
            ))}
          </Stack>

          <Box sx={{ flex: 1 }} />

          <TextField
            size="small"
            placeholder="搜尋訂單號 / MOMO 單號 / 買家 / 商品"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded sx={{ color: "#98a2b3" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: { xs: "100%", sm: 320 },
              "& .MuiOutlinedInput-root": { bgcolor: "#f8fafc", "& fieldset": { borderColor: "#eaecf0" } },
            }}
          />
        </Stack>

        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f9fafb" }}>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>電商通路</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>誠得單號 / MOMO 單號</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>買家姓名與地區</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>訂購商品明細</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>總金額 / 付款方式</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>物流與編號</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>狀態</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }} align="right">
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      沒有找到符合條件的訂單
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const ch = channelStyle(order.channelCode);
                  const st = statusStyle(order.status);
                  return (
                    <TableRow key={order.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell>
                        <Chip
                          label={ch.name}
                          size="small"
                          sx={{
                            bgcolor: ch.bgcolor,
                            color: ch.color,
                            border: `1px solid ${ch.borderColor}`,
                            fontWeight: 800,
                            fontSize: 11.5,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontWeight: 750, fontSize: 13.5, color: "#1e293b" }}>{order.orderNo}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                          {order.channelOrderNo}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: ch.bgcolor, color: ch.color, fontSize: 13, fontWeight: 700 }}>
                            {order.customerName.slice(0, 1)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{order.customerName}</Typography>
                            <Typography sx={{ fontSize: 11.5, color: "#64748b" }}>{order.customerCity}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 650, color: "#334155" }}>
                          {order.items[0].name}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: "#64748b" }}>
                          規格: {order.items[0].spec} x {order.items[0].qty}
                          {order.items.length > 1 && ` (共 ${order.items.length} 項)`}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                          NT$ {order.totalAmount.toLocaleString()}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: "#64748b" }}>{order.paymentMethod}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: "#334155" }}>{order.logistics}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                          {order.trackingNo}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip label={order.status} size="small" sx={{ ...st, fontWeight: 750, fontSize: 11.5 }} />
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedOrder(order)}
                            sx={{
                              borderColor: "#cbd5e1",
                              color: "#334155",
                              fontSize: 12,
                              fontWeight: 700,
                              px: 1.2,
                            }}
                          >
                            詳情
                          </Button>
                          {order.status === "待發貨" && (
                            <Button
                              size="small"
                              variant="contained"
                              sx={{
                                bgcolor: ch.color,
                                "&:hover": { bgcolor: ch.color, filter: "brightness(0.9)" },
                                fontSize: 12,
                                fontWeight: 700,
                                px: 1.2,
                              }}
                            >
                              發貨
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {selectedOrder && (
        <Dialog
          open={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          maxWidth="md"
          fullWidth
          sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Chip
                  label={selectedOrder.channel}
                  size="small"
                  sx={{
                    ...channelStyle(selectedOrder.channelCode),
                    fontWeight: 800,
                  }}
                />
                <Typography sx={{ fontSize: 18, fontWeight: 850 }}>訂單詳細內容 - {selectedOrder.orderNo}</Typography>
              </Stack>
              <Chip
                label={selectedOrder.status}
                size="small"
                sx={{ ...statusStyle(selectedOrder.status), fontWeight: 750 }}
              />
            </Stack>
          </DialogTitle>
          <Divider />

          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
              <Paper elevation={0} sx={{ p: 2.2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#64748b", mb: 1.5, textTransform: "uppercase" }}>
                  訂單與電商串接資訊
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>系統訂單號：</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 750 }}>{selectedOrder.orderNo}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>MOMO 賣場編號：</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 750, fontFamily: "monospace" }}>
                        {selectedOrder.channelOrderNo}
                      </Typography>
                      <Tooltip title={copiedText ? "已複製！" : "複製單號"}>
                        <IconButton size="small" onClick={() => copyToClipboard(selectedOrder.channelOrderNo)}>
                          <ContentCopyRounded sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>下單時間：</Typography>
                    <Typography sx={{ fontSize: 13 }}>{selectedOrder.createdAt}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>付款方式：</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 650 }}>{selectedOrder.paymentMethod}</Typography>
                  </Box>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 2.2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#64748b", mb: 1.5, textTransform: "uppercase" }}>
                  收件人與物流配送
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>收件姓名：</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 750 }}>{selectedOrder.customerName}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>聯絡電話：</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{selectedOrder.customerPhone}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>配送地址：</Typography>
                    <Typography sx={{ fontSize: 13, textAlign: "right", maxWidth: 240, fontWeight: 600 }}>
                      {selectedOrder.address}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>物流方式與追蹤碼：</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 750, color: "#2563eb" }}>
                      {selectedOrder.logistics} ({selectedOrder.trackingNo})
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1.5 }}>訂購商品清單</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 750, fontSize: 12.5 }}>商品名稱</TableCell>
                        <TableCell sx={{ fontWeight: 750, fontSize: 12.5 }}>規格 / 款式</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 750, fontSize: 12.5 }}>
                          單價
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 750, fontSize: 12.5 }}>
                          數量
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 750, fontSize: 12.5 }}>
                          小計
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{item.name}</TableCell>
                          <TableCell sx={{ color: "#64748b", fontSize: 12.5 }}>{item.spec}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 13 }}>
                            NT$ {item.price.toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700 }}>
                            {item.qty}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 13, fontWeight: 800 }}>
                            NT$ {(item.price * item.qty).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: "#fafafa" }}>
                        <TableCell colSpan={4} align="right" sx={{ fontWeight: 800, fontSize: 14 }}>
                          總計金額：
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
                          NT$ {selectedOrder.totalAmount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {selectedOrder.note && (
                  <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 750, color: "#d48806" }}>
                      買家特別備註：{selectedOrder.note}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: "1px solid #eaecf0" }}>
            <Button variant="outlined" startIcon={<PrintRounded />} sx={{ borderColor: "#cbd5e1", color: "#334155" }}>
              列印 MOMO 出貨單
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => setSelectedOrder(null)} sx={{ color: "#64748b" }}>
              關閉
            </Button>
            <Button variant="contained" sx={{ bgcolor: "#2563eb" }}>
              確定並儲存變更
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

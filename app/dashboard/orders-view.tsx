"use client";

import SearchRounded from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { type SubmitEvent, useEffect, useState } from "react";
import { useLatestRequest } from "@/app/hooks/useLatestRequest";
import { useOrdersViewModel } from "@/app/hooks/useOrdersViewModel";
import { usePagination } from "@/app/hooks/usePagination";
import type { OrderItem } from "@/app/types/order";
import { errorMessage } from "@/app/utils/errors";
import {
  channelStyle,
  getDefaultDateRange,
  getMaxEndDate,
  statusStyle,
} from "@/app/utils/orders";
import { loadOrdersPageData } from "./orders-actions";
import OrderDetailDialog from "./order-detail-dialog";
import { pickupStoreLabel } from "./order-format";
import { usePlatformSettings } from "./platform-settings-context";
import { headCell } from "./table-styles";

export default function OrdersView() {
  const { enabledPlatforms } = usePlatformSettings();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [orderStatus, setOrderStatus] = useState("ALL");
  const [deliveryType, setDeliveryType] = useState("All");
  const [storeDeliveryType, setStoreDeliveryType] = useState("All");
  const runLatest = useLatestRequest();

  const {
    channelTab,
    setChannelTab,
    setSearchQuery,
    selectedOrder,
    setSelectedOrder,
    copiedText,
    filteredOrders,
    stats,
    copyToClipboard,
  } = useOrdersViewModel(orders);

  const pagination = usePagination(filteredOrders);

  const activePlatform = enabledPlatforms.find((platform) => platform.code === channelTab);
  const availableOrderStatusOptions = activePlatform?.orderStatusOptions ?? [];
  const availableDeliveryTypeOptions = activePlatform?.deliveryTypeOptions ?? [];
  const availableStoreDeliveryTypeOptions = activePlatform?.storeDeliveryTypeOptions ?? [];
  const storeDeliveryTypeForDeliveryTypes = activePlatform?.storeDeliveryTypeForDeliveryTypes ?? [];

  const selectedOrderStatus = availableOrderStatusOptions.some((option) => option.value === orderStatus)
    ? orderStatus
    : (availableOrderStatusOptions[0]?.value ?? "ALL");

  const selectedDeliveryType = availableDeliveryTypeOptions.some((option) => option.value === deliveryType)
    ? deliveryType
    : (availableDeliveryTypeOptions[0]?.value ?? "All");

  const supportsStoreDeliveryType = storeDeliveryTypeForDeliveryTypes.includes(selectedDeliveryType);
  const selectedStoreDeliveryType =
    supportsStoreDeliveryType && availableStoreDeliveryTypeOptions.some((option) => option.value === storeDeliveryType)
      ? storeDeliveryType
      : "All";

  const handleSearch = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!channelTab) return;
    const query = { ...dateRange };
    pagination.resetPage();
    setHasSearched(true);
    setLoading(true);
    setLoadError(null);
    runLatest(() => loadOrdersPageData(query, channelTab, {
      status: selectedOrderStatus,
      deliveryType: selectedDeliveryType,
      storeDeliveryType: selectedStoreDeliveryType,
    }), {
      onSuccess: setOrders,
      onError: (error) => setLoadError(errorMessage(error, "Failed to load orders")),
      onSettled: () => setLoading(false),
    });
  };

  const handleStartDateChange = (startDate: string) => {
    setDateRange((current) => {
      const maxEndDate = getMaxEndDate(startDate);
      const endDate = current.endDate < startDate ? startDate : current.endDate > maxEndDate ? maxEndDate : current.endDate;
      return { startDate, endDate };
    });
  };

  // 頁面首次載入或目前平台被停用時，選取第一個已啟用的平台。
  useEffect(() => {
    const fallbackPlatform = enabledPlatforms[0];
    if (!fallbackPlatform || enabledPlatforms.some((platform) => platform.code === channelTab)) return;
    setChannelTab(fallbackPlatform.code);
  }, [channelTab, enabledPlatforms, setChannelTab]);

  const selectedChannelName = activePlatform?.name ?? "";

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

      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, mb: 3, p: 0.8, bgcolor: "#ffffff" }}>
        <Tabs
          value={channelTab ?? false}
          onChange={(_, channelCode) => {
            const platform = enabledPlatforms.find((item) => item.code === channelCode);
            setChannelTab(channelCode);
            setOrderStatus(platform?.orderStatusOptions[0]?.value ?? "ALL");
            setDeliveryType(platform?.deliveryTypeOptions?.[0]?.value ?? "All");
            setStoreDeliveryType(platform?.storeDeliveryTypeOptions?.[0]?.value ?? "All");
            pagination.resetPage();
          }}
          sx={{
            minHeight: 48,
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
              bgcolor: enabledPlatforms.find((p) => p.code === channelTab)?.color ?? "#2563eb",
            },
          }}
        >
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
                </Stack>
              }
              sx={{ px: 2.5, py: 1.2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: platform.color } }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2.25, mb: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #eaecf0", borderRadius: 3 }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            {`${selectedChannelName}筆數`}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 26, fontWeight: 850 }}>{stats.totalOrders} 筆</Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #eaecf0", borderRadius: 3 }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            總銷售金額
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
        </Paper>

      </Box>

      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, overflow: "hidden" }}>
        <Stack
          component="form"
          onSubmit={handleSearch}
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { lg: "center" },
            p: 2.5,
            borderBottom: "1px solid #eaecf0",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flexWrap: "wrap", width: { xs: "100%", lg: "auto" } }}>
            <TextField
              label="開始日期"
              type="date"
              size="small"
              value={dateRange.startDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": "開始日期" } }}
              sx={{ width: { xs: "100%", sm: 150 } }}
            />
            <TextField
              label="結束日期"
              type="date"
              size="small"
              value={dateRange.endDate}
              onChange={(event) => setDateRange((current) => ({ ...current, endDate: event.target.value }))}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  "aria-label": "結束日期",
                  min: dateRange.startDate,
                  max: getMaxEndDate(dateRange.startDate),
                },
              }}
              sx={{ width: { xs: "100%", sm: 150 } }}
            />

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
              <InputLabel id="order-status-label">訂單狀態</InputLabel>
              <Select
                labelId="order-status-label"
                label="訂單狀態"
                value={availableOrderStatusOptions.length ? selectedOrderStatus : ""}
                disabled={availableOrderStatusOptions.length === 0}
                onChange={(event) => { setOrderStatus(event.target.value); pagination.resetPage(); }}
              >
                {availableOrderStatusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {availableDeliveryTypeOptions.length > 0 && (
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
                <InputLabel id="delivery-type-label">配送類型</InputLabel>
                <Select
                  labelId="delivery-type-label"
                  label="配送類型"
                  value={selectedDeliveryType}
                  onChange={(event) => {
                    const nextDeliveryType = event.target.value;
                    setDeliveryType(nextDeliveryType);
                    if (!storeDeliveryTypeForDeliveryTypes.includes(nextDeliveryType)) {
                      setStoreDeliveryType("All");
                    }
                    pagination.resetPage();
                  }}
                >
                  {availableDeliveryTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {availableStoreDeliveryTypeOptions.length > 0 && supportsStoreDeliveryType && (
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
                <InputLabel id="store-delivery-type-label">超取分類</InputLabel>
                <Select
                  labelId="store-delivery-type-label"
                  label="超取分類"
                  value={selectedStoreDeliveryType}
                  onChange={(event) => { setStoreDeliveryType(event.target.value); pagination.resetPage(); }}
                >
                  {availableStoreDeliveryTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ width: { xs: "100%", md: "auto" } }}>
            <TextField
              size="small"
              placeholder="搜尋訂單編號 / 買家 / 商品"
              value={keyword}
              onChange={(event) => {
                const nextKeyword = event.target.value;
                setKeyword(nextKeyword);
                setSearchQuery(nextKeyword);
                pagination.resetPage();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
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
                flex: 1,
                minWidth: { sm: 260 },
                "& .MuiOutlinedInput-root": { bgcolor: "#f8fafc", "& fieldset": { borderColor: "#eaecf0" } },
              }}
            />
            <Button type="submit" variant="contained" startIcon={<SearchRounded />} sx={{ px: 2.5, whiteSpace: "nowrap" }}>
              載入訂單
            </Button>
          </Stack>
        </Stack>

        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f9fafb" }}>
                <TableCell sx={headCell}>電商通路</TableCell>
                <TableCell sx={headCell}>訂單編號</TableCell>

                <TableCell sx={headCell}>訂購商品明細</TableCell>
                <TableCell sx={headCell}>總金額</TableCell>
                <TableCell sx={headCell}>物流與編號</TableCell>
                <TableCell sx={headCell}>狀態</TableCell>
                <TableCell sx={headCell}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} />
                  </TableCell>
                </TableRow>
              ) : !hasSearched ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      請選擇查詢條件後按下「搜尋」。
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      沒有找到符合條件的訂單
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pagination.pagedItems.map((order) => {
                  const ch = channelStyle(order.channelCode);
                  const st = statusStyle(order.status);
                  const firstItem = order.items[0] as (typeof order.items)[number] | undefined;
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
                      </TableCell>

                      <TableCell sx={{ maxWidth: 260 }}>
                        {/*
                          平台可能回傳沒有任何品項的訂單（例如整張單都已取消），
                          此時只顯示佔位符，不能讓整張表格因為存取 items[0] 而炸掉。
                        */}
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 650, color: "#334155" }}>
                          {firstItem ? firstItem.name : "—"}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: "#64748b" }}>
                          {firstItem ? `規格: ${firstItem.spec} x ${firstItem.qty}` : "無商品明細"}
                          {order.items.length > 1 && ` (共 ${order.items.length} 項)`}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                          NT$ {order.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: "#334155" }}>{order.logistics}</Typography>
                        {order.pickupStore && (
                          <Chip
                            label={`超商：${pickupStoreLabel(order.pickupStore)}`}
                            size="small"
                            sx={{ mt: 0.5, height: 21, fontSize: 10.5, fontWeight: 750, bgcolor: "#ecfdf3", color: "#027a48" }}
                          />
                        )}
                        <Typography sx={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                          {order.trackingNo}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip label={order.status} size="small" sx={{ ...st, fontWeight: 750, fontSize: 11.5 }} />
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
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
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredOrders.length}
          page={pagination.page}
          onPageChange={pagination.onPageChange}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="每頁筆數"
        />
      </Paper>

      <OrderDetailDialog
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onCopy={copyToClipboard}
        copied={copiedText}
      />
    </Box>
  );
}

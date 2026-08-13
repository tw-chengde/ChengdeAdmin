"use client";

import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
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
import type { FormEvent } from "react";
import { useMergeBindings } from "@/app/hooks/useMergeBindings";
import { usePagination } from "@/app/hooks/usePagination";
import type { ListingStatus, ListingStatusFilter } from "@/app/lib/platforms/product";
import type { PlatformCode } from "@/app/lib/platforms/types";
import { bindingKey, productLabel, type BindingFilter } from "@/app/utils/product-bindings";
import BindProductDialog from "./bind-product-dialog";
import ConfirmDialog from "./confirm-dialog";
import MergeLimitChip from "./merge-limit-chip";
import { headCell, stickyActionCell } from "./table-styles";

function StatCard({ label, value, hint, color }: { label: string; value: number; hint: string; color?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2.2, border: "1px solid #eee5e1", borderRadius: 3, bgcolor: "white" }}>
      <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 800, mt: 1, color }}>{value}</Typography>
      <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1 }}>
        {hint}
      </Typography>
    </Paper>
  );
}

const listingStatusLabel: Record<ListingStatus, string> = {
  LISTED: "上架中",
  DELISTED: "已下架",
};

const listingFilterLabel: Record<ListingStatusFilter, string> = { ALL: "全部", ...listingStatusLabel };

export default function MergeBindingsView() {
  const merge = useMergeBindings();
  const {
    enabledPlatforms,
    selectedChannel,
    selectedPlatform,
    data,
    loading,
    loadError,
    channelFailure,
    searched,
    appliedQuery,
    keyword,
    filter,
    listingStatus,
    bound,
    productById,
    channelProducts,
    visibleProducts,
    stats,
    bind,
    unbind,
  } = merge;

  const pagination = usePagination(visibleProducts);

  // 條件改了但還沒送出時，畫面上顯示的仍是舊條件的結果，需提示使用者按下查詢。
  const staleStatusLabel =
    appliedQuery && appliedQuery.listingStatus !== listingStatus ? listingFilterLabel[appliedQuery.listingStatus] : null;

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    pagination.resetPage();
    merge.search();
  };

  const handleChannelChange = (next: PlatformCode) => {
    merge.selectChannel(next);
    pagination.resetPage();
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 3 }}
      >
        <Box>
          <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 28 }, fontWeight: 850, letterSpacing: "-.03em" }}>
            併單管理
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
            查詢各平台目前上架的商品，並綁定到「商品管理」中的商品主檔
          </Typography>
        </Box>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}

      {/* 通路 Tabs 切換（依已啟用平台動態產生） */}
      <Paper elevation={0} sx={{ border: "1px solid #eee5e1", borderRadius: 3, mb: 3, p: 0.8, bgcolor: "white" }}>
        <Tabs
          value={selectedChannel}
          onChange={(_, next: PlatformCode) => handleChannelChange(next)}
          sx={{
            minHeight: 48,
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", bgcolor: selectedPlatform?.color ?? "#eb714a" },
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
                    sx={{ width: 22, height: 22, borderRadius: "4px", objectFit: platform.logoObjectFit }}
                  />
                  <Typography sx={{ fontWeight: 750, fontSize: 15 }}>{platform.name}</Typography>
                </Stack>
              }
              sx={{ px: 3, py: 1.2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: platform.color } }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* 單一平台查詢失敗時仍顯示其他平台，失敗原因就地提示（momo 需要 IP allowlist 或 proxy）。 */}
      {channelFailure && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {selectedPlatform?.name ?? channelFailure.platformCode} 商品查詢失敗：{channelFailure.message}
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2, mb: 3.5 }}>
        <StatCard label={`${selectedPlatform?.name ?? ""} 商品總數`} value={stats.total} hint="平台目前查得的商品筆數" />
        <StatCard label="已綁定" value={stats.bound} hint="已對應到本地商品主檔" color="#2e7d32" />
        <StatCard label="未綁定" value={stats.unbound} hint="併單上限尚無法套用" color="#c62828" />
        <StatCard label="本地商品" value={data.products.length} hint="商品管理中的商品主檔筆數" />
      </Box>

      {/*
        搜尋與篩選操作列。只有「商品狀態」會送進平台 API（按下查詢才生效）；
        綁定狀態與關鍵字是前端即時篩選，不需重新查詢平台。
      */}
      <Paper
        component="form"
        onSubmit={handleSearch}
        elevation={0}
        sx={{ p: 2.5, border: "1px solid #eee5e1", borderRadius: 3, mb: 3, bgcolor: "white" }}
      >
        <Grid container spacing={2} sx={{ alignItems: "flex-end" }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.8, color: "#666" }}>商品狀態</Typography>
            <Select
              fullWidth
              size="small"
              value={listingStatus}
              inputProps={{ "aria-label": "商品狀態" }}
              onChange={(e) => merge.setListingStatus(e.target.value as ListingStatusFilter)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="ALL">全部</MenuItem>
              <MenuItem value="LISTED">上架中</MenuItem>
              <MenuItem value="DELISTED">已下架</MenuItem>
            </Select>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.8, color: "#666" }}>綁定狀態</Typography>
            <Select
              fullWidth
              size="small"
              value={filter}
              inputProps={{ "aria-label": "綁定狀態" }}
              onChange={(e) => {
                merge.setFilter(e.target.value as BindingFilter);
                pagination.resetPage();
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="ALL">全部</MenuItem>
              <MenuItem value="BOUND">已綁定</MenuItem>
              <MenuItem value="UNBOUND">未綁定</MenuItem>
            </Select>
          </Grid>

          <Grid size={{ xs: 12, sm: 8, md: 4 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.8, color: "#666" }}>
              平台商品編號 / 商品名稱 / 原廠編號
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={`搜尋 ${selectedPlatform?.name ?? ""} 的商品編號、名稱、原廠編號…`}
              value={keyword}
              onChange={(e) => {
                merge.setKeyword(e.target.value);
                pagination.resetPage();
              }}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { "aria-label": "搜尋平台商品" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded sx={{ color: "#aaa" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchRounded />}
              disabled={loading || !selectedChannel}
              sx={{
                background: "linear-gradient(145deg, #d65730, #eb714a)",
                fontWeight: 700,
                py: 1,
                whiteSpace: "nowrap",
              }}
            >
              查詢
            </Button>
          </Grid>
        </Grid>

        {/* 清單是上次查詢的快取，條件改過就提醒使用者現在看到的不是新條件的結果。 */}
        {staleStatusLabel && !loading && (
          <Typography sx={{ fontSize: 12.5, color: "#b54708", mt: 1.8 }}>
            目前顯示的是「{staleStatusLabel}」的查詢結果，按下「查詢」以套用新條件。
          </Typography>
        )}
      </Paper>

      {/* 平台商品清單 */}
      <Paper elevation={0} sx={{ border: "1px solid #eee5e1", borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 1080 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f9fafb" }}>
                <TableCell sx={headCell}>平台商品編號</TableCell>
                <TableCell sx={headCell}>商品名稱</TableCell>
                <TableCell sx={headCell}>原廠編號</TableCell>
                <TableCell sx={headCell}>售價</TableCell>
                <TableCell sx={headCell}>規格數</TableCell>
                <TableCell sx={headCell}>綁定的本地商品</TableCell>
                <TableCell sx={{ ...stickyActionCell, ...headCell, bgcolor: "#f9fafb" }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} sx={{ color: "#d65730" }} />
                  </TableCell>
                </TableRow>
              ) : pagination.pagedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      {!searched
                        ? "請選擇查詢條件後按下「查詢」。"
                        : channelProducts.length === 0
                          ? "此平台目前查無商品。"
                          : "沒有符合篩選條件的商品。"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pagination.pagedItems.map((item) => {
                  const record = bound.get(bindingKey(item.platformCode, item.goodsCode));
                  const local = record ? productById.get(record.product_id) : undefined;
                  return (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{
                        "&:last-child td, &:last-child th": { borderBottom: 0 },
                        // hover 的底色套在 row 上，固定欄有自己的不透明背景，需另外跟著變色
                        "&:hover .binding-action-cell": { bgcolor: "#f9fafb" },
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 750, color: "#1e293b", fontFamily: "monospace" }}>
                          {item.goodsCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 650, color: "#334155" }}>{item.name}</Typography>
                        {item.listingStatus && (
                          <Typography sx={{ fontSize: 12, color: "#94a3b8", mt: 0.2 }}>
                            {listingStatusLabel[item.listingStatus]}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, color: "#64748b", fontFamily: "monospace" }}>
                          {item.entpGoodsNo ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: "#334155" }}>
                          {item.salePrice === null ? "—" : `NT$ ${item.salePrice.toLocaleString()}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: "#334155" }}>{item.skuCount}</Typography>
                      </TableCell>
                      <TableCell>
                        {local ? (
                          <Stack spacing={0.6}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                              {productLabel(local)}
                            </Typography>
                            <Stack direction="row" spacing={0.6}>
                              <MergeLimitChip limit={local.cvs_merge_limit} channel="cvs" />
                              <MergeLimitChip limit={local.logistics_merge_limit} channel="logistics" />
                            </Stack>
                          </Stack>
                        ) : record ? (
                          // 綁定存在但本地商品讀不到（例如剛被刪除），仍顯示快照名稱避免整列變空白。
                          <Typography sx={{ fontSize: 13, color: "#b42318" }}>
                            綁定的本地商品已不存在
                          </Typography>
                        ) : (
                          <Chip
                            label="未綁定"
                            size="small"
                            sx={{ fontWeight: 750, fontSize: 12, bgcolor: "#f2f4f7", color: "#667085" }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="binding-action-cell" sx={{ ...stickyActionCell, bgcolor: "#ffffff" }}>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant={record ? "outlined" : "contained"}
                            startIcon={<LinkRounded fontSize="small" />}
                            onClick={() => merge.openBind(item)}
                            sx={
                              record
                                ? { borderColor: "#d0d5dd", color: "#344054", whiteSpace: "nowrap" }
                                : {
                                  background: "linear-gradient(145deg, #d65730, #eb714a)",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }
                            }
                          >
                            {record ? "變更綁定" : "綁定"}
                          </Button>
                          {record && (
                            <Button
                              size="small"
                              color="error"
                              startIcon={<LinkOffRounded fontSize="small" />}
                              onClick={() => unbind.open(item)}
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              解除綁定
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

        <TablePagination
          component="div"
          count={visibleProducts.length}
          page={pagination.page}
          onPageChange={pagination.onPageChange}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="每頁筆數"
        />
      </Paper>

      <BindProductDialog
        target={bind.target}
        products={data.products}
        selectedProduct={merge.selectedProduct}
        onSelectProduct={merge.setSelectedProduct}
        onSubmit={merge.submitBind}
        onClose={bind.close}
        pending={bind.pending}
        error={bind.error}
      />

      <ConfirmDialog
        open={Boolean(unbind.target)}
        title="解除綁定"
        confirmLabel="確定解除"
        confirmIcon={<LinkOffRounded />}
        pending={unbind.pending}
        error={unbind.error}
        onConfirm={merge.submitUnbind}
        onClose={unbind.close}
      >
        確定要解除「{unbind.target?.name}」（{unbind.target?.goodsCode}）與本地商品的綁定嗎？解除後此平台商品將不再套用併單上限。
      </ConfirmDialog>

      <Snackbar
        open={merge.snackbar.open}
        autoHideDuration={4000}
        onClose={merge.closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={merge.snackbar.severity} onClose={merge.closeSnackbar} sx={{ width: "100%" }}>
          {merge.snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

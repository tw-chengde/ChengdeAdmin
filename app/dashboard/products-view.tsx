"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRounded from "@mui/icons-material/LocalShippingRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import StorefrontRounded from "@mui/icons-material/StorefrontRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useProductsAdmin } from "@/app/hooks/useProductsAdmin";
import ConfirmDialog from "./confirm-dialog";
import MergeLimitChip from "./merge-limit-chip";
import ProductFormDialog from "./product-form-dialog";
import LoadingBackdrop from "./loading-backdrop";
import { headCell, stickyActionCell } from "./table-styles";

export default function ProductsView() {
  const {
    products,
    loading,
    loadError,
    success,
    dismissSuccess,
    reload,
    create,
    edit,
    remove,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    openCreate,
    openEdit,
    submitCreate,
    submitEdit,
    submitDelete,
  } = useProductsAdmin();

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 3 }}
      >
        <Box>
          <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 28 }, fontWeight: 850, letterSpacing: "-.03em" }}>
            商品管理
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
            統一管理商品主檔與併單規則。同一商品即使在各平台以不同名稱多次上架，都對應到這裡的一筆商品與代號。
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshRounded />}
            onClick={reload}
            disabled={loading}
            sx={{ borderColor: "#d0d5dd", color: "#344054", bgcolor: "white" }}
          >
            重新整理
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={openCreate}
            sx={{
              background: "linear-gradient(145deg, #d65730, #eb714a)",
              fontWeight: 700,
              px: 2.6,
              whiteSpace: "nowrap",
            }}
          >
            新增商品
          </Button>
        </Stack>
      </Stack>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={dismissSuccess}>
          {success}
        </Alert>
      )}

      {/* 商品列表 */}
      <Paper elevation={0} sx={{ border: "1px solid #eaecf0", borderRadius: 3, overflow: "hidden" }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", p: 2.5, borderBottom: "1px solid #eaecf0" }}
        >
          <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "#fef2ec", color: "#d65730" }}>
            <Inventory2Rounded fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>商品清單</Typography>
            <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>共 {products.length} 項商品</Typography>
          </Box>
        </Stack>

        {loadError && (
          <Alert severity="error" sx={{ m: 2.5 }}>
            {loadError}
          </Alert>
        )}

        <TableContainer>
          <Table sx={{ minWidth: 880 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f9fafb" }}>
                <TableCell sx={headCell}>商品代號</TableCell>
                <TableCell sx={headCell}>商品名稱</TableCell>
                <TableCell sx={headCell}>庫存</TableCell>
                <TableCell sx={headCell}>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                    <StorefrontRounded sx={{ fontSize: 15 }} />
                    <span>超商併單上限</span>
                  </Stack>
                </TableCell>
                <TableCell sx={headCell}>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                    <LocalShippingRounded sx={{ fontSize: 15 }} />
                    <span>物流併單上限</span>
                  </Stack>
                </TableCell>
                <TableCell sx={headCell}>建立時間</TableCell>
                <TableCell sx={{ ...stickyActionCell, ...headCell, bgcolor: "#f9fafb" }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      尚無商品，請點右上角的「新增商品」。
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { borderBottom: 0 },
                      // hover 的底色套在 row 上，固定欄有自己的不透明背景，需另外跟著變色
                      "&:hover .product-action-cell": { bgcolor: "#f9fafb" },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 750, color: "#1e293b", fontFamily: "monospace" }}>
                        {product.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 650, color: "#334155" }}>{product.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.stock}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: 12,
                          bgcolor: product.stock > 0 ? "#ecfdf3" : "#fef3f2",
                          color: product.stock > 0 ? "#027a48" : "#b42318",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <MergeLimitChip limit={product.cvs_merge_limit} channel="cvs" />
                    </TableCell>
                    <TableCell>
                      <MergeLimitChip limit={product.logistics_merge_limit} channel="logistics" />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>{product.created_at}</Typography>
                    </TableCell>
                    <TableCell
                      className="product-action-cell"
                      sx={{ ...stickyActionCell, bgcolor: "#ffffff" }}
                    >
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="修改商品">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(product)}
                            sx={{ color: "#667085", "&:hover": { color: "#d65730", bgcolor: "#fef2ec" } }}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="刪除商品">
                          <IconButton
                            size="small"
                            onClick={() => remove.open(product)}
                            sx={{ color: "#667085", "&:hover": { color: "#b42318", bgcolor: "#fef3f2" } }}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ProductFormDialog
        open={Boolean(create.target)}
        title="新增商品"
        value={createForm}
        onChange={(next) => setCreateForm((form) => ({ ...form, ...next }))}
        onSubmit={submitCreate}
        onClose={create.close}
        pending={create.pending}
        error={create.error}
        submitLabel="確定新增"
        submitIcon={<AddRounded />}
      />

      <ProductFormDialog
        open={Boolean(edit.target)}
        title="修改商品"
        value={editForm}
        onChange={(next) => setEditForm((form) => ({ ...form, ...next }))}
        onSubmit={submitEdit}
        onClose={edit.close}
        pending={edit.pending}
        error={edit.error}
        submitLabel="儲存變更"
      />

      <ConfirmDialog
        open={Boolean(remove.target)}
        title="刪除商品"
        confirmLabel="確定刪除"
        confirmIcon={<DeleteOutlineRounded />}
        pending={remove.pending}
        error={remove.error}
        onConfirm={submitDelete}
        onClose={remove.close}
      >
        確定要刪除商品「{remove.target?.name}」（{remove.target?.code}）嗎？此動作無法復原。
      </ConfirmDialog>

      <LoadingBackdrop open={loading} message="正在載入商品資料，請稍候..." />
    </Box>
  );
}

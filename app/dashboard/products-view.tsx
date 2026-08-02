"use client";

import {
  AddRounded,
  DeleteOutlineRounded,
  EditRounded,
  Inventory2Rounded,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState, useTransition } from "react";
import type { Product } from "@/app/types/product";
import { createProduct, deleteProduct, listProducts, updateProduct } from "./products-actions";

const emptyForm = { code: "", name: "", stock: "" };

/**
 * 「操作」欄固定在表格右側，水平捲動時不會被推出畫面。
 * 背景需為不透明色，否則捲動時底下的儲存格會透出來。
 */
const stickyActionCell = {
  position: "sticky" as const,
  right: 0,
  zIndex: 2,
  borderLeft: "1px solid #eaecf0",
};

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  // 修改商品對話框。editing 為目前正在編輯的商品，null 代表對話框關閉。
  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  // 刪除確認對話框。deleting 為待刪除的商品，null 代表對話框關閉。
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const loadProducts = () => {
    setLoading(true);
    setLoadError(null);
    listProducts()
      .then((rows) => setProducts(rows))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "載入商品失敗"))
      .finally(() => setLoading(false));
  };

  // Initial load. State is only updated from the async callbacks (not
  // synchronously in the effect body); `loading` already defaults to true.
  useEffect(() => {
    let active = true;
    listProducts()
      .then((rows) => {
        if (active) setProducts(rows);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : "載入商品失敗");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    startSubmit(async () => {
      const result = await createProduct({
        code: form.code,
        name: form.name,
        stock: Number(form.stock === "" ? 0 : form.stock),
      });
      if (result.ok) {
        setForm(emptyForm);
        setSuccess("商品已新增");
        loadProducts();
      } else {
        setFormError(result.error ?? "新增失敗");
      }
    });
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setEditForm({ code: product.code, name: product.name, stock: String(product.stock) });
    setEditError(null);
  };

  const closeEdit = () => {
    if (isSaving) return;
    setEditing(null);
    setEditError(null);
  };

  const handleUpdate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setEditError(null);
    setSuccess(null);
    startSave(async () => {
      const result = await updateProduct({
        id: editing.id,
        code: editForm.code,
        name: editForm.name,
        stock: Number(editForm.stock === "" ? 0 : editForm.stock),
      });
      if (result.ok) {
        setEditing(null);
        setSuccess("商品已更新");
        loadProducts();
      } else {
        setEditError(result.error ?? "修改失敗");
      }
    });
  };

  const closeDelete = () => {
    if (isDeleting) return;
    setDeleting(null);
    setDeleteError(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setDeleteError(null);
    setSuccess(null);
    startDelete(async () => {
      const result = await deleteProduct(deleting.id);
      if (result.ok) {
        setDeleting(null);
        setSuccess(`商品「${deleting.name}」已刪除`);
        loadProducts();
      } else {
        setDeleteError(result.error ?? "刪除失敗");
      }
    });
  };

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
            統一管理商品主檔。同一商品即使在各平台以不同名稱多次上架，都對應到這裡的一筆商品與代號。
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshRounded />}
          onClick={loadProducts}
          disabled={loading}
          sx={{ borderColor: "#d0d5dd", color: "#344054", bgcolor: "white", alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          重新整理
        </Button>
      </Stack>

      {/* 新增商品表單 */}
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 3, border: "1px solid #eaecf0", bgcolor: "#ffffff" }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 2, color: "#0f172a" }}>新增商品</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "flex-start" } }}>
          <TextField
            label="商品代號"
            placeholder="例如 CD-1001"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            required
            size="small"
            sx={{ flex: 1, minWidth: 0 }}
          />
          <TextField
            label="商品名稱"
            placeholder="例如 誠得尊榮保溫瓶 750ml"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            size="small"
            sx={{ flex: 2, minWidth: 0 }}
          />
          <TextField
            label="庫存"
            type="number"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            size="small"
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            sx={{ width: { xs: "100%", md: 140 } }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <AddRounded />}
            disabled={isSubmitting}
            sx={{
              background: "linear-gradient(145deg, #d65730, #eb714a)",
              fontWeight: 700,
              px: 2.6,
              py: 1,
              whiteSpace: "nowrap",
              alignSelf: { xs: "stretch", md: "center" },
            }}
          >
            新增商品
          </Button>
        </Stack>
        {formError && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setFormError(null)}>
            {formError}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
      </Paper>

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
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f9fafb" }}>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>商品代號</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>商品名稱</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }} align="right">庫存</TableCell>
                <TableCell sx={{ color: "#667085", fontSize: 12, fontWeight: 750 }}>建立時間</TableCell>
                <TableCell
                  align="right"
                  sx={{ ...stickyActionCell, color: "#667085", fontSize: 12, fontWeight: 750, bgcolor: "#f9fafb" }}
                >
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} sx={{ color: "#d65730" }} />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      尚無商品，請使用上方表單新增。
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
                    <TableCell align="right">
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
                      <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>{product.created_at}</Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      className="product-action-cell"
                      sx={{ ...stickyActionCell, bgcolor: "#ffffff" }}
                    >
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
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
                            onClick={() => {
                              setDeleting(product);
                              setDeleteError(null);
                            }}
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

      {/* 修改商品對話框 */}
      <Dialog
        open={Boolean(editing)}
        onClose={closeEdit}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { component: "form", onSubmit: handleUpdate, sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>修改商品</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="商品代號"
              value={editForm.code}
              onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
              required
              size="small"
              fullWidth
            />
            <TextField
              label="商品名稱"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
              size="small"
              fullWidth
            />
            <TextField
              label="庫存"
              type="number"
              value={editForm.stock}
              onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
              size="small"
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              sx={{ width: { xs: "100%", sm: 180 } }}
            />
            {editError && <Alert severity="error">{editError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={closeEdit}
            disabled={isSaving}
            sx={{ color: "#344054", fontWeight: 700 }}
          >
            取消
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ background: "linear-gradient(145deg, #d65730, #eb714a)", fontWeight: 700, px: 2.6 }}
          >
            儲存變更
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog
        open={Boolean(deleting)}
        onClose={closeDelete}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>刪除商品</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 14, color: "#344054" }}>
            確定要刪除商品「{deleting?.name}」（{deleting?.code}）嗎？此動作無法復原。
          </Typography>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={closeDelete} disabled={isDeleting} sx={{ color: "#344054", fontWeight: 700 }}>
            取消
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineRounded />}
            sx={{ fontWeight: 700, px: 2.6 }}
          >
            確定刪除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

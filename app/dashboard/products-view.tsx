"use client";

import {
  AddRounded,
  Inventory2Rounded,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { useEffect, useState, useTransition } from "react";
import { createProduct, listProducts, type Product } from "./products-actions";

const emptyForm = { code: "", name: "", stock: "" };

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

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
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} sx={{ color: "#d65730" }} />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      尚無商品，請使用上方表單新增。
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

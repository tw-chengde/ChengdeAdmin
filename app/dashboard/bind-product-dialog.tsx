"use client";

import LinkRounded from "@mui/icons-material/LinkRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { FormEvent } from "react";
import type { PlatformProduct } from "@/app/lib/platforms/product";
import type { Product } from "@/app/types/product";
import { productLabel } from "@/app/utils/product-bindings";

interface BindProductDialogProps {
  /** 正在綁定的平台商品；null 代表對話框關閉。 */
  target: PlatformProduct | null;
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onSubmit: () => void;
  onClose: () => void;
  pending: boolean;
  error: string | null;
}

/** 把平台商品綁定到本地商品主檔的對話框（新增綁定與變更綁定共用）。 */
export default function BindProductDialog({
  target,
  products,
  selectedProduct,
  onSelectProduct,
  onSubmit,
  onClose,
  pending,
  error,
}: BindProductDialogProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog
      open={Boolean(target)}
      onClose={pending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { component: "form", onSubmit: handleSubmit, sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>綁定本地商品</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>平台商品</Typography>
            <Typography sx={{ fontSize: 14.5, fontWeight: 750, color: "#0f172a", mt: 0.3 }}>{target?.name}</Typography>
            <Typography sx={{ fontSize: 12.5, color: "#64748b", fontFamily: "monospace", mt: 0.2 }}>
              {target?.goodsCode}
              {target?.entpGoodsNo ? ` · 原廠編號 ${target.entpGoodsNo}` : ""}
            </Typography>
          </Box>

          <Autocomplete
            options={products}
            value={selectedProduct}
            onChange={(_, next) => onSelectProduct(next)}
            getOptionLabel={productLabel}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label="本地商品" placeholder="以商品代號或名稱搜尋" size="small" required />
            )}
          />

          <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>
            綁定後此平台商品的併單上限，會直接沿用所選本地商品在「商品管理」中設定的超商與物流上限。
          </Typography>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 2.5 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} disabled={pending} sx={{ color: "#344054", fontWeight: 700 }}>
          取消
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={pending}
          startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <LinkRounded />}
          sx={{ background: "linear-gradient(145deg, #d65730, #eb714a)", fontWeight: 700, px: 2.6 }}
        >
          確定綁定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { FormEvent, ReactNode } from "react";
import type { ProductFormState } from "@/app/utils/product-form";

interface ProductFormDialogProps {
  open: boolean;
  title: string;
  value: ProductFormState;
  onChange: (next: Partial<ProductFormState>) => void;
  onSubmit: () => void;
  onClose: () => void;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  submitIcon?: ReactNode;
}

/** 新增與修改商品共用的表單對話框；兩者只差在標題、按鈕文字與送出的 action。 */
export default function ProductFormDialog({
  open,
  title,
  value,
  onChange,
  onSubmit,
  onClose,
  pending,
  error,
  submitLabel,
  submitIcon,
}: ProductFormDialogProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { component: "form", onSubmit: handleSubmit, sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="商品代號"
            placeholder="例如 CD-1001"
            value={value.code}
            onChange={(e) => onChange({ code: e.target.value })}
            required
            size="small"
            fullWidth
          />
          <TextField
            label="商品名稱"
            placeholder="例如 誠得尊榮保溫瓶 750ml"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            size="small"
            fullWidth
          />
          <TextField
            label="庫存"
            type="number"
            value={value.stock}
            onChange={(e) => onChange({ stock: e.target.value })}
            size="small"
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            sx={{ width: { xs: "100%", sm: 180 } }}
          />

          <Divider />

          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>併單規則</Typography>
            <Typography sx={{ fontSize: 12.5, color: "#64748b", mt: 0.3 }}>
              同一張併單中此商品最多可出貨的件數；填 0 表示該通路不可併單。
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="超商併單上限"
              type="number"
              value={value.cvsMergeLimit}
              onChange={(e) => onChange({ cvsMergeLimit: e.target.value })}
              size="small"
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              sx={{ flex: 1, minWidth: 0 }}
            />
            <TextField
              label="物流併單上限"
              type="number"
              value={value.logisticsMergeLimit}
              onChange={(e) => onChange({ logisticsMergeLimit: e.target.value })}
              size="small"
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              sx={{ flex: 1, minWidth: 0 }}
            />
          </Stack>
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
          startIcon={pending ? <CircularProgress size={16} color="inherit" /> : submitIcon}
          sx={{ background: "linear-gradient(145deg, #d65730, #eb714a)", fontWeight: 700, px: 2.6 }}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

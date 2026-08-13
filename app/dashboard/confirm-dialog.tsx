"use client";

import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** 說明文字；需要粗體或多段時可直接傳節點。 */
  children: ReactNode;
  confirmLabel: string;
  /** 送出中顯示 spinner，並擋住取消與關閉，避免動作進行到一半被關掉。 */
  pending: boolean;
  error: string | null;
  confirmIcon?: ReactNode;
  confirmColor?: "error" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 「刪除商品」「解除綁定」這類確認對話框的共用外殼。
 * 兩處原本各自寫了一份幾乎相同的結構，行為（尤其是送出中的鎖定）容易各自漂移。
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pending,
  error,
  confirmIcon,
  confirmColor = "error",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ fontSize: 14, color: "#344054" }}>{children}</Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} disabled={pending} sx={{ color: "#344054", fontWeight: 700 }}>
          取消
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          disabled={pending}
          startIcon={pending ? <CircularProgress size={16} color="inherit" /> : confirmIcon}
          sx={{ fontWeight: 700, px: 2.6 }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

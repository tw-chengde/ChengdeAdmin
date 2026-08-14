"use client";

import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import type { ReactNode } from "react";
import type { OrderItem } from "@/app/types/order";
import { channelStyle, statusStyle } from "@/app/utils/orders";
import { pickupStoreLabel } from "./order-format";

interface OrderDetailDialogProps {
  /** 要顯示的訂單；null 代表對話框關閉。 */
  order: OrderItem | null;
  onClose: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "flex-start" }}>
      <Typography sx={{ fontSize: 13, color: "#64748b", flexShrink: 0 }}>{label}</Typography>
      {children}
    </Box>
  );
}

function CopyableValue({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: (text: string) => void }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", minWidth: 0 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 750, fontFamily: "monospace", wordBreak: "break-all" }}>
        {value}
      </Typography>
      <Tooltip title={copied ? "已複製！" : "複製單號"}>
        <IconButton size="small" onClick={() => onCopy(value)}>
          <ContentCopyRounded sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function OrderDetailDialog({ order, onClose, onCopy, copied }: OrderDetailDialogProps) {
  if (!order) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ "& .MuiDialog-paper": { borderRadius: 3, maxWidth: 1100 } }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Chip label={order.channel} size="small" sx={{ ...channelStyle(order.channelCode), fontWeight: 800 }} />
            <Typography sx={{ fontSize: 18, fontWeight: 850 }}>訂單詳細內容 - {order.orderNo}</Typography>
          </Stack>
          <Chip
            label={
              order.statusDetail && order.statusDetail !== order.status
                ? `${order.status}／${order.statusDetail}`
                : order.status
            }
            size="small"
            sx={{ ...statusStyle(order.status), fontWeight: 750 }}
          />
        </Stack>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#64748b", mb: 1.5, textTransform: "uppercase" }}>
              訂單與電商串接資訊
            </Typography>
            <Stack spacing={1.2}>
              <Field label="訂單編號：">
                <CopyableValue value={order.orderNo} copied={copied} onCopy={onCopy} />
              </Field>
              <Field label="下單時間：">
                <Typography sx={{ fontSize: 13 }}>{order.createdAt}</Typography>
              </Field>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#64748b", mb: 1.5, textTransform: "uppercase" }}>
              收件人與物流配送
            </Typography>
            <Stack spacing={1.2}>
              <Field label="收件姓名：">
                <Typography sx={{ fontSize: 13, fontWeight: 750 }}>{order.customerName}</Typography>
              </Field>
              <Field label="配送地址：">
                <Typography sx={{ fontSize: 13, textAlign: "right", fontWeight: 600, wordBreak: "break-word" }}>
                  {order.address}
                </Typography>
              </Field>
              <Field label="物流方式與追蹤碼：">
                <Typography sx={{ fontSize: 13, fontWeight: 750, color: "#2563eb", textAlign: "right", wordBreak: "break-word" }}>
                  {order.logistics}
                  {order.trackingNo ? ` (${order.trackingNo})` : ""}
                </Typography>
              </Field>
              {order.pickupStore && (
                <Field label="取貨超商：">
                  <Chip
                    label={`超商：${pickupStoreLabel(order.pickupStore)}`}
                    size="small"
                    sx={{ height: 24, fontSize: 11.5, fontWeight: 750, bgcolor: "#ecfdf3", color: "#027a48" }}
                  />
                </Field>
              )}
            </Stack>
          </Paper>

          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1.5 }}>訂購商品清單</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 600 }}>
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
                  {order.items.map((item, index) => (
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
                      NT$ {order.totalAmount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {order.note && (
              <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 2 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 750, color: "#d48806" }}>
                  買家特別備註：{order.note}
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: "1px solid #eaecf0" }}>
        <Button onClick={onClose} sx={{ color: "#64748b" }}>
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
}

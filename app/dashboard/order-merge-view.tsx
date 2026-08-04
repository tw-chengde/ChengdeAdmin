"use client";

import {
  CancelRounded,
  CheckCircleRounded,
  EditRounded,
  LocalShippingRounded,
  MergeTypeRounded,
  RefreshRounded,
  SaveRounded,
  SearchRounded,
  StorefrontRounded,
  TuneRounded,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  Stack,
  Switch,
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
import { useMemo, useState } from "react";

export interface DeliveryRule {
  allowMerge: boolean;
  maxQty: number; // 0 表示不限數量
  note: string;
}

export interface MergeProductItem {
  id: string;
  sku: string;
  name: string;
  channel: "MOMO 購物網" | "Mo 店+";
  category: string;
  price: number;
  spec: string;
  imageBg: string;
  homeDelivery: DeliveryRule;
  cvs: DeliveryRule; // 超商取貨併單規則
  updatedAt: string;
}

// 模擬 MOMO 購物網 與 Mo 店+ 商品與併單規則清單
const initialProducts: MergeProductItem[] = [
  {
    id: "PRD-MM-001",
    sku: "MM-ITEM-8812",
    name: "誠得尊榮高溫真空保溫瓶 750ml",
    channel: "MOMO 購物網",
    category: "生活用品",
    price: 1280,
    spec: "曜石黑 / 750ml",
    imageBg: "#e3f2fd",
    homeDelivery: {
      allowMerge: true,
      maxQty: 6,
      note: "一箱最多可裝 6 入，超出需拆件發貨",
    },
    cvs: {
      allowMerge: true,
      maxQty: 2,
      note: "超商積材限制，上限 2 件",
    },
    updatedAt: "2026-07-30 14:20",
  },
  {
    id: "PRD-MM-002",
    sku: "MM-ITEM-8819",
    name: "承風人體工學透氣辦公椅",
    channel: "MOMO 購物網",
    category: "傢俱寢飾",
    price: 6800,
    spec: "經典灰 / 全功能版",
    imageBg: "#ffebee",
    homeDelivery: {
      allowMerge: false,
      maxQty: 1,
      note: "大件大型商品，限獨立宅配出貨",
    },
    cvs: {
      allowMerge: false,
      maxQty: 0,
      note: "超出超商材積，不可使用超商取貨",
    },
    updatedAt: "2026-07-31 09:15",
  },
  {
    id: "PRD-MO-001",
    sku: "MO-STORE-3310",
    name: "極簡質感無段調節護眼檯燈",
    channel: "Mo 店+",
    category: "家電數位",
    price: 2480,
    spec: "霧面白 / LED 雙色溫",
    imageBg: "#f3e5f5",
    homeDelivery: {
      allowMerge: true,
      maxQty: 4,
      note: "宅配標準箱可裝 4 組",
    },
    cvs: {
      allowMerge: true,
      maxQty: 1,
      note: "超商僅能單件包裝發貨",
    },
    updatedAt: "2026-07-29 18:40",
  },
  {
    id: "PRD-MO-002",
    sku: "MO-STORE-3342",
    name: "有機極致淬鍊咖啡豆 (中深烘焙)",
    channel: "Mo 店+",
    category: "美食食品",
    price: 650,
    spec: "500g 裝 / 經典接壓閥包裝",
    imageBg: "#fff8e1",
    homeDelivery: {
      allowMerge: true,
      maxQty: 12,
      note: "整箱上限 12 包",
    },
    cvs: {
      allowMerge: true,
      maxQty: 6,
      note: "超商取貨限制上限 6 包 (5kg限制)",
    },
    updatedAt: "2026-07-31 11:05",
  },
  {
    id: "PRD-MM-003",
    sku: "MM-ITEM-9011",
    name: "無線智慧溫控快煮壺 1.5L",
    channel: "MOMO 購物網",
    category: "小家電",
    price: 1850,
    spec: "不鏽鋼銀 / 防燙雙層",
    imageBg: "#e8f5e9",
    homeDelivery: {
      allowMerge: true,
      maxQty: 3,
      note: "宅配最大並箱裝數 3 件",
    },
    cvs: {
      allowMerge: true,
      maxQty: 1,
      note: "彩盒體積大，超商限 1 件",
    },
    updatedAt: "2026-07-28 16:50",
  },
  {
    id: "PRD-MO-003",
    sku: "MO-STORE-4109",
    name: "雙層隔熱玻璃高質感杯組",
    channel: "Mo 店+",
    category: "居家生活",
    price: 450,
    spec: "2 入組 / 禮盒裝",
    imageBg: "#e0f7fa",
    homeDelivery: {
      allowMerge: true,
      maxQty: 10,
      note: "需有防震氣泡墊，箱裝上限 10 盒",
    },
    cvs: {
      allowMerge: true,
      maxQty: 4,
      note: "易碎物品，超商上限 4 盒",
    },
    updatedAt: "2026-07-31 10:00",
  },
  {
    id: "PRD-MM-004",
    sku: "MM-ITEM-9204",
    name: "極致靜音多功能除濕機 12L",
    channel: "MOMO 購物網",
    category: "家電數位",
    price: 8900,
    spec: "珍珠白 / 日除濕12L",
    imageBg: "#f1f8e9",
    homeDelivery: {
      allowMerge: false,
      maxQty: 1,
      note: "重型機器，專箱單獨出貨",
    },
    cvs: {
      allowMerge: false,
      maxQty: 0,
      note: "超重過大，禁止超商配送",
    },
    updatedAt: "2026-07-25 12:00",
  },
];

export default function OrderMergeView() {
  const [products, setProducts] = useState<MergeProductItem[]>(initialProducts);
  const [selectedChannel, setSelectedChannel] = useState<string>("MOMO");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("ALL"); // ALL, HOME_ALLOW, CVS_ALLOW, NO_MERGE
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleChannelTabChange = (_: React.SyntheticEvent, newChannel: string) => {
    if (newChannel) {
      setSelectedChannel(newChannel);
      setSelectedIds([]);
    }
  };

  // 編輯單一商品對話框狀態
  const [editProduct, setEditProduct] = useState<MergeProductItem | null>(null);
  const [editForm, setEditForm] = useState<{
    homeAllow: boolean;
    homeMax: number;
    homeNote: string;
    cvsAllow: boolean;
    cvsMax: number;
    cvsNote: string;
  }>({
    homeAllow: true,
    homeMax: 1,
    homeNote: "",
    cvsAllow: true,
    cvsMax: 1,
    cvsNote: "",
  });

  // 批次編輯對話框狀態
  const [batchOpen, setBatchOpen] = useState<boolean>(false);
  const [batchForm, setBatchForm] = useState<{
    targetDelivery: "BOTH" | "HOME" | "CVS";
    allowMerge: boolean;
    maxQty: number;
    note: string;
  }>({
    targetDelivery: "BOTH",
    allowMerge: true,
    maxQty: 3,
    note: "統一批次更新併單規範",
  });

  // 提示訊息 Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "info" | "warning" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // 搜尋與篩選邏輯
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 通路篩選
      if (selectedChannel === "MOMO" && p.channel !== "MOMO 購物網") return false;
      if (selectedChannel === "MO_STORE" && p.channel !== "Mo 店+") return false;

      // 併單類型篩選
      if (deliveryFilter === "HOME_ALLOW" && !p.homeDelivery.allowMerge) return false;
      if (deliveryFilter === "CVS_ALLOW" && !p.cvs.allowMerge) return false;
      if (deliveryFilter === "NO_MERGE" && (p.homeDelivery.allowMerge || p.cvs.allowMerge)) return false;

      // 關鍵字搜尋
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCategory = p.category.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCategory) return false;
      }

      return true;
    });
  }, [products, selectedChannel, deliveryFilter, searchQuery]);

  // 全選與反選
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 開啟單件編輯對話框
  const handleOpenEdit = (product: MergeProductItem) => {
    setEditProduct(product);
    setEditForm({
      homeAllow: product.homeDelivery.allowMerge,
      homeMax: product.homeDelivery.maxQty,
      homeNote: product.homeDelivery.note,
      cvsAllow: product.cvs.allowMerge,
      cvsMax: product.cvs.maxQty,
      cvsNote: product.cvs.note,
    });
  };

  // 儲存單件編輯 (Mock API Call)
  const handleSaveEdit = () => {
    if (!editProduct) return;

    const updatedTime = new Date().toISOString().replace("T", " ").slice(0, 16);

    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === editProduct.id) {
          return {
            ...item,
            homeDelivery: {
              allowMerge: editForm.homeAllow,
              maxQty: editForm.homeMax,
              note: editForm.homeNote,
            },
            cvs: {
              allowMerge: editForm.cvsAllow,
              maxQty: editForm.cvsMax,
              note: editForm.cvsNote,
            },
            updatedAt: updatedTime,
          };
        }
        return item;
      })
    );

    setEditProduct(null);
    setSnackbar({
      open: true,
      message: `已成功更新「${editProduct.name}」之宅配與超商併單規則！`,
      severity: "success",
    });
  };

  // 儲存批次編輯 (Mock API Call)
  const handleSaveBatch = () => {
    if (selectedIds.length === 0) return;

    const updatedTime = new Date().toISOString().replace("T", " ").slice(0, 16);

    setProducts((prev) =>
      prev.map((item) => {
        if (selectedIds.includes(item.id)) {
          const newHome =
            batchForm.targetDelivery === "CVS"
              ? item.homeDelivery
              : {
                  allowMerge: batchForm.allowMerge,
                  maxQty: batchForm.maxQty,
                  note: batchForm.note || item.homeDelivery.note,
                };
          const newCvs =
            batchForm.targetDelivery === "HOME"
              ? item.cvs
              : {
                  allowMerge: batchForm.allowMerge,
                  maxQty: batchForm.maxQty,
                  note: batchForm.note || item.cvs.note,
                };
          return {
            ...item,
            homeDelivery: newHome,
            cvs: newCvs,
            updatedAt: updatedTime,
          };
        }
        return item;
      })
    );

    setBatchOpen(false);
    setSelectedIds([]);
    setSnackbar({
      open: true,
      message: `已成功批次更新 ${selectedIds.length} 項商品之併單規則！`,
      severity: "success",
    });
  };

  // 統計數據 (依選取之通路)
  const stats = useMemo(() => {
    const momoCount = products.filter((p) => p.channel === "MOMO 購物網").length;
    const moStoreCount = products.filter((p) => p.channel === "Mo 店+").length;

    const channelProducts = products.filter((p) =>
      selectedChannel === "MOMO" ? p.channel === "MOMO 購物網" : p.channel === "Mo 店+"
    );

    const total = channelProducts.length;
    const homeAllowCount = channelProducts.filter((p) => p.homeDelivery.allowMerge).length;
    const cvsAllowCount = channelProducts.filter((p) => p.cvs.allowMerge).length;
    const noMergeCount = channelProducts.filter((p) => !p.homeDelivery.allowMerge && !p.cvs.allowMerge).length;

    return { total, momoCount, moStoreCount, homeAllowCount, cvsAllowCount, noMergeCount };
  }, [products, selectedChannel]);

  return (
    <Box sx={{ width: "100%" }}>
      {/* 標題與簡介 */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                bgcolor: "var(--color-primary-light, #fde4dc)",
                color: "var(--color-primary, #eb714a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MergeTypeRounded fontSize="medium" />
            </Box>
            <Box>
              <Typography component="h1" sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 800, letterSpacing: "-.02em" }}>
                併單規則管理
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.2 }}>
                設定 MOMO 購物網 與 Mo 店+ 商品之「宅配」與「超商取貨」併單限制與包裹上限數量
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          {selectedIds.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<TuneRounded />}
              onClick={() => setBatchOpen(true)}
              sx={{
                bgcolor: "var(--color-primary, #eb714a)",
                "&:hover": { bgcolor: "var(--color-primary-dark, #d65730)" },
                borderRadius: 2,
                px: 2.5,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(235, 113, 74, 0.25)",
              }}
            >
              批次修改併單規則 ({selectedIds.length})
            </Button>
          )}
          <Tooltip title="重新載入規則 (Mock Refresh)">
            <IconButton
              onClick={() =>
                setSnackbar({ open: true, message: "已從伺服器同步最新商品併單規則數據 (Mock API)", severity: "info" })
              }
              sx={{ border: "1px solid #eee5e1", borderRadius: 2, bgcolor: "white" }}
            >
              <RefreshRounded />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* 通路 Tabs 切換 (MOMO 購物網 / Mo 店+) */}
      <Paper elevation={0} sx={{ border: "1px solid #eee5e1", borderRadius: 3, mb: 3, p: 0.8, bgcolor: "white" }}>
        <Tabs
          value={selectedChannel}
          onChange={handleChannelTabChange}
          sx={{
            minHeight: 48,
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
              bgcolor: selectedChannel === "MOMO" ? "#ec008c" : "#ff6b00",
            },
          }}
        >
          <Tab
            value="MOMO"
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Box
                  component="img"
                  src="/images/momo.png"
                  alt="MOMO"
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "4px",
                    objectFit: "contain",
                  }}
                />
                <Typography sx={{ fontWeight: 750, fontSize: 15 }}>MOMO 購物</Typography>
                <Chip
                  label={stats.momoCount}
                  size="small"
                  sx={{ bgcolor: "#fdf2f8", color: "#be185d", fontWeight: 800, fontSize: 11.5 }}
                />
              </Stack>
            }
            sx={{ px: 3, py: 1.2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#ec008c" } }}
          />
          <Tab
            value="MO_STORE"
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Box
                  component="img"
                  src="/images/mo-store.jpg"
                  alt="Mo 店+"
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "4px",
                    objectFit: "cover",
                  }}
                />
                <Typography sx={{ fontWeight: 750, fontSize: 15 }}>Mo 店+</Typography>
                <Chip
                  label={stats.moStoreCount}
                  size="small"
                  sx={{ bgcolor: "#fff7ed", color: "#ea580c", fontWeight: 800, fontSize: 11.5 }}
                />
              </Stack>
            }
            sx={{ px: 3, py: 1.2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#ff6b00" } }}
          />
        </Tabs>
      </Paper>

      {/* 數據統計概覽卡片 */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2, mb: 3.5 }}>
        <Paper elevation={0} sx={{ p: 2.2, border: "1px solid #eee5e1", borderRadius: 3, bgcolor: "white" }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            {selectedChannel === "MOMO" ? "MOMO 購物" : "Mo 店+"} 商品總數
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", mt: 1 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{stats.total}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              項商品
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label={`MOMO: ${stats.momoCount}`} size="small" sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 700, fontSize: 11 }} />
            <Chip label={`Mo店+: ${stats.moStoreCount}`} size="small" sx={{ bgcolor: "#f3e5f5", color: "#7b1fa2", fontWeight: 700, fontSize: 11 }} />
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.2, border: "1px solid #eee5e1", borderRadius: 3, bgcolor: "white" }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            宅配允許併單商品
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", mt: 1 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#2e7d32" }}>{stats.homeAllowCount}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              / {stats.total} 項
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1 }}>
            提供宅配包裝併件優惠
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.2, border: "1px solid #eee5e1", borderRadius: 3, bgcolor: "white" }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            超商允許併單商品
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", mt: 1 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#0288d1" }}>{stats.cvsAllowCount}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              / {stats.total} 項
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1 }}>
            受 45x30x30cm 及 5kg 材積限制
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.2, border: "1px solid #eee5e1", borderRadius: 3, bgcolor: "white" }}>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>
            獨立獨箱/禁止併單商品
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", mt: 1 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#c62828" }}>{stats.noMergeCount}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              項大件商品
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1 }}>
            大型家具、易碎重型裝箱
          </Typography>
        </Paper>
      </Box>

      {/* 搜尋與篩選操作列 */}
      <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #eee5e1", borderRadius: 3, mb: 3, bgcolor: "white" }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          {/* 併單規則條件篩選 */}
          <Grid size={{ xs: 12, sm: 5, md: 4 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.8, color: "#666" }}>
              併單許可狀態
            </Typography>
            <Select
              fullWidth
              size="small"
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="ALL">全部規則狀態</MenuItem>
              <MenuItem value="HOME_ALLOW">允許宅配併單</MenuItem>
              <MenuItem value="CVS_ALLOW">允許超商併單</MenuItem>
              <MenuItem value="NO_MERGE">限單獨出貨 (不可併單)</MenuItem>
            </Select>
          </Grid>

          {/* 關鍵字搜尋 */}
          <Grid size={{ xs: 12, sm: 7, md: 8 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.8, color: "#666" }}>
              商品名稱 / SKU / 類別關鍵字
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={`搜尋 ${selectedChannel === "MOMO" ? "MOMO 購物" : "Mo 店+"} 的商品名稱、SKU 編號...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
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
        </Grid>
      </Paper>

      {/* 商品併單規則列表 Table */}
      <Paper elevation={0} sx={{ border: "1px solid #eee5e1", borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#faf7f5" }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      filteredProducts.length > 0 &&
                      selectedIds.length === filteredProducts.length
                    }
                    indeterminate={
                      selectedIds.length > 0 && selectedIds.length < filteredProducts.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 750, color: "#555", fontSize: 13 }}>商品資訊 (SKU / 名稱)</TableCell>
                <TableCell sx={{ fontWeight: 750, color: "#555", fontSize: 13 }}>銷售通路</TableCell>
                <TableCell sx={{ fontWeight: 750, color: "#1b5e20", fontSize: 13 }}>
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                    <LocalShippingRounded fontSize="small" />
                    <span>宅配併單規則</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontWeight: 750, color: "#01579b", fontSize: 13 }}>
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                    <StorefrontRounded fontSize="small" />
                    <span>超商併單規則</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontWeight: 750, color: "#555", fontSize: 13 }}>最後修改時間</TableCell>
                <TableCell align="right" sx={{ fontWeight: 750, color: "#555", fontSize: 13 }}>
                  操作
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 15, fontWeight: 600 }}>
                      查無符合條件的商品併單規則
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
                      請嘗試調整搜尋關鍵字或通路篩選
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <TableRow key={p.id} hover selected={isSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={isSelected} onChange={() => handleSelectOne(p.id)} />
                      </TableCell>

                      {/* 商品名稱與資訊 */}
                      <TableCell>
                        <Stack direction="row" spacing={1.8} sx={{ alignItems: "center" }}>
                          <Avatar
                            variant="rounded"
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: p.imageBg,
                              color: "#444",
                              fontWeight: 800,
                              fontSize: 14,
                            }}
                          >
                            {p.name.slice(0, 1)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 750, fontSize: 14.5, color: "#222" }}>
                              {p.name}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.3 }}>
                              <Typography color="text.secondary" sx={{ fontSize: 12, fontFamily: "monospace" }}>
                                {p.sku}
                              </Typography>
                              <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                                • {p.spec}
                              </Typography>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>
                                NT$ {p.price.toLocaleString()}
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* 通路標籤 */}
                      <TableCell>
                        {p.channel === "MOMO 購物網" ? (
                          <Chip
                            label="MOMO 購物網"
                            size="small"
                            sx={{
                              bgcolor: "#e3f2fd",
                              color: "#1565c0",
                              fontWeight: 750,
                              fontSize: 11.5,
                              border: "1px solid #bbdefb",
                            }}
                          />
                        ) : (
                          <Chip
                            label="Mo 店+"
                            size="small"
                            sx={{
                              bgcolor: "#f3e5f5",
                              color: "#7b1fa2",
                              fontWeight: 750,
                              fontSize: 11.5,
                              border: "1px solid #e1bee7",
                            }}
                          />
                        )}
                      </TableCell>

                      {/* 宅配併單規則 */}
                      <TableCell sx={{ minWidth: 200 }}>
                        {p.homeDelivery.allowMerge ? (
                          <Box>
                            <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", mb: 0.3 }}>
                              <Chip
                                label={`可併單 (上限 ${p.homeDelivery.maxQty} 件/箱)`}
                                size="small"
                                icon={<CheckCircleRounded style={{ fontSize: 14 }} />}
                                color="success"
                                sx={{ fontWeight: 700, fontSize: 11.5 }}
                              />
                            </Stack>
                            <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>
                              {p.homeDelivery.note}
                            </Typography>
                          </Box>
                        ) : (
                          <Box>
                            <Chip
                              label="不可併單 (獨立出貨)"
                              size="small"
                              icon={<CancelRounded style={{ fontSize: 14 }} />}
                              color="error"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: 11.5 }}
                            />
                            <Typography color="text.secondary" sx={{ fontSize: 11.5, mt: 0.3 }}>
                              {p.homeDelivery.note}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>

                      {/* 超商併單規則 */}
                      <TableCell sx={{ minWidth: 200 }}>
                        {p.cvs.allowMerge ? (
                          <Box>
                            <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", mb: 0.3 }}>
                              <Chip
                                label={`可併單 (上限 ${p.cvs.maxQty} 件)`}
                                size="small"
                                icon={<CheckCircleRounded style={{ fontSize: 14 }} />}
                                sx={{ bgcolor: "#e1f5fe", color: "#0288d1", fontWeight: 700, fontSize: 11.5 }}
                              />
                            </Stack>
                            <Typography color="text.secondary" sx={{ fontSize: 11.5 }}>
                              {p.cvs.note}
                            </Typography>
                          </Box>
                        ) : (
                          <Box>
                            <Chip
                              label="不適用 / 不可超併"
                              size="small"
                              icon={<CancelRounded style={{ fontSize: 14 }} />}
                              sx={{ bgcolor: "#efebe9", color: "#8d6e63", fontWeight: 700, fontSize: 11.5 }}
                            />
                            <Typography color="text.secondary" sx={{ fontSize: 11.5, mt: 0.3 }}>
                              {p.cvs.note}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>

                      {/* 更新時間 */}
                      <TableCell sx={{ color: "#777", fontSize: 12 }}>
                        {p.updatedAt}
                      </TableCell>

                      {/* 操作按鈕 */}
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditRounded />}
                          onClick={() => handleOpenEdit(p)}
                          sx={{
                            borderRadius: 2,
                            borderColor: "#e0e0e0",
                            color: "#444",
                            fontWeight: 700,
                            "&:hover": { borderColor: "var(--color-primary)", color: "var(--color-primary)" },
                          }}
                        >
                          修改規則
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 單一商品併單規則修改對話框 Dialog */}
      <Dialog
        open={Boolean(editProduct)}
        onClose={() => setEditProduct(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 20 }}>
          修改商品併單規則
        </DialogTitle>
        <DialogContent dividers>
          {editProduct && (
            <Stack spacing={3}>
              {/* 商品概觀標頭 */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#faf6f4", border: "1px solid #eee5e1", borderRadius: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: editProduct.imageBg, color: "#333", fontWeight: 800 }}>
                    {editProduct.name.slice(0, 1)}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{editProduct.name}</Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>
                      SKU: {editProduct.sku} | 通路: {editProduct.channel}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* 1. 宅配併單設定 */}
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#1b5e20", mb: 1.5 }}>
                  🚚 宅配 (Home Delivery) 併單規則
                </Typography>

                <Stack spacing={2} sx={{ pl: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editForm.homeAllow}
                        onChange={(e) => setEditForm({ ...editForm, homeAllow: e.target.checked })}
                        color="success"
                      />
                    }
                    label={<Typography sx={{ fontWeight: 700 }}>允許宅配與其他商品併單</Typography>}
                  />

                  {editForm.homeAllow && (
                    <TextField
                      label="宅配單一包裹最大併件上限件數 (件)"
                      type="number"
                      size="small"
                      value={editForm.homeMax}
                      onChange={(e) => setEditForm({ ...editForm, homeMax: Number(e.target.value) })}
                      helperText="填寫該商品在一個宅配標準箱中所能容納的最大數量"
                    />
                  )}

                  <TextField
                    label="宅配併單備註與限制說明"
                    size="small"
                    fullWidth
                    value={editForm.homeNote}
                    onChange={(e) => setEditForm({ ...editForm, homeNote: e.target.value })}
                    placeholder="例如：箱裝上限6入、易碎品需氣泡布獨立固定"
                  />
                </Stack>
              </Box>

              <Divider />

              {/* 2. 超商取貨併單設定 */}
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#01579b", mb: 1.5 }}>
                  🏪 超商取貨 (CVS Pickup) 併單規則
                </Typography>

                <Stack spacing={2} sx={{ pl: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editForm.cvsAllow}
                        onChange={(e) => setEditForm({ ...editForm, cvsAllow: e.target.checked })}
                        color="info"
                      />
                    }
                    label={<Typography sx={{ fontWeight: 700 }}>允許超商取貨併單</Typography>}
                  />

                  {editForm.cvsAllow && (
                    <TextField
                      label="超商包裹最大併件件數上限 (件)"
                      type="number"
                      size="small"
                      value={editForm.cvsMax}
                      onChange={(e) => setEditForm({ ...editForm, cvsMax: Number(e.target.value) })}
                      helperText="受限於超商長寬高 45x30x30cm 及 5kg 限制"
                    />
                  )}

                  <TextField
                    label="超商併單材積與警示說明"
                    size="small"
                    fullWidth
                    value={editForm.cvsNote}
                    onChange={(e) => setEditForm({ ...editForm, cvsNote: e.target.value })}
                    placeholder="例如：體積較大限1件、滿2件易超材"
                  />
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditProduct(null)} sx={{ color: "#666" }}>
            取消
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveRounded />}
            onClick={handleSaveEdit}
            sx={{
              bgcolor: "var(--color-primary, #eb714a)",
              "&:hover": { bgcolor: "var(--color-primary-dark, #d65730)" },
              px: 3,
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            儲存變更 (Mock API)
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批次修改併單規則對話框 Dialog */}
      <Dialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 20 }}>
          批次修改併單規則 ({selectedIds.length} 項商品)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              您已選擇 <strong>{selectedIds.length}</strong> 項商品，將統一更新選定之物流配送管道的併單設定。
            </Alert>

            {/* 選擇要修改的管道 */}
            <FormControl>
              <FormLabel sx={{ fontWeight: 700, color: "#333", mb: 1 }}>
                請選擇欲批次修改的物流管道
              </FormLabel>
              <RadioGroup
                row
                value={batchForm.targetDelivery}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, targetDelivery: e.target.value as "BOTH" | "HOME" | "CVS" })
                }
              >
                <FormControlLabel value="BOTH" control={<Radio />} label="同時修改 (宅配 + 超商)" />
                <FormControlLabel value="HOME" control={<Radio />} label="僅修改 宅配" />
                <FormControlLabel value="CVS" control={<Radio />} label="僅修改 超商" />
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* 併單許可與上限 */}
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={batchForm.allowMerge}
                    onChange={(e) => setBatchForm({ ...batchForm, allowMerge: e.target.checked })}
                  />
                }
                label={<Typography sx={{ fontWeight: 700 }}>設為允許併單</Typography>}
              />

              {batchForm.allowMerge && (
                <TextField
                  label="單一包裹併件上限件數 (件)"
                  type="number"
                  size="small"
                  value={batchForm.maxQty}
                  onChange={(e) => setBatchForm({ ...batchForm, maxQty: Number(e.target.value) })}
                />
              )}

              <TextField
                label="統一備註/說明"
                size="small"
                value={batchForm.note}
                onChange={(e) => setBatchForm({ ...batchForm, note: e.target.value })}
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setBatchOpen(false)} sx={{ color: "#666" }}>
            取消
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveRounded />}
            onClick={handleSaveBatch}
            sx={{
              bgcolor: "var(--color-primary, #eb714a)",
              "&:hover": { bgcolor: "var(--color-primary-dark, #d65730)" },
              px: 3,
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            套用批次修改 (Mock API)
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示訊息 Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2, fontWeight: 700 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

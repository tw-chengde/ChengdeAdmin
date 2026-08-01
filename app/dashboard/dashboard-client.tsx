"use client";

import {
  AssessmentRounded,
  CalendarMonthRounded,
  ChevronRightRounded,
  DashboardRounded,
  Inventory2Rounded,
  LocalMallRounded,
  LogoutRounded,
  MenuRounded,
  MenuOpenRounded,
  MergeTypeRounded,
  MoreHorizRounded,
  PeopleAltRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useState } from "react";
import { signOutFromDashboard } from "@/app/actions";
import { appTheme } from "@/app/theme";
import OrderMergeView from "./order-merge-view";
import OrdersView from "./orders-view";
import ProductsView from "./products-view";

const drawerWidth = 252;
const collapsedDrawerWidth = 72;
const navItems = [
  ["總覽", DashboardRounded],
  ["訂單管理", LocalMallRounded],
  ["併單管理", MergeTypeRounded],
  ["客戶管理", PeopleAltRounded],
  ["商品管理", Inventory2Rounded],
  ["分析報表", AssessmentRounded],
] as const;
const metrics = [
  ["本月營收", "NT$ 1,284,600", "+12.8%", "#eb714a"],
  ["今日訂單", "186", "+8.2%", "#d65730"],
  ["新客戶", "428", "+18.4%", "#f09273"],
  ["轉換率", "3.68%", "+0.6%", "#b4532f"],
] as const;
const orders = [
  ["#CD-2841", "林怡君", "NT$ 8,420", "已完成", "10:42"],
  ["#CD-2840", "陳冠宇", "NT$ 3,680", "處理中", "10:18"],
  ["#CD-2839", "許雅雯", "NT$ 12,900", "待付款", "09:56"],
  ["#CD-2838", "黃品皓", "NT$ 5,260", "已完成", "09:21"],
  ["#CD-2837", "吳欣蓉", "NT$ 2,150", "已取消", "08:45"],
] as const;
const channels = [
  ["官方網站", 68, "NT$ 873,500", "#eb714a"],
  ["品牌門市", 47, "NT$ 284,200", "#d65730"],
  ["合作通路", 31, "NT$ 126,900", "#f09273"],
] as const;
const bars = [34, 46, 40, 58, 48, 65, 72, 68, 79, 74, 88, 94];

function statusStyle(status: string) {
  if (status === "已完成") return { color: "#027a48", bgcolor: "#ecfdf3" };
  if (status === "處理中") return { color: "#d65730", bgcolor: "#fff8f5" };
  if (status === "待付款") return { color: "#b54708", bgcolor: "#fffaeb" };
  return { color: "#b42318", bgcolor: "#fef3f2" };
}

export default function DashboardClient({ user }: { user: { name: string; email: string; image?: string } }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("總覽");
  const [period, setPeriod] = useState("近 12 天");
  const desktop = useMediaQuery(appTheme.breakpoints.up("md"));
  const compactSidebar = desktop && desktopCollapsed;
  const sidebarWidth = compactSidebar ? collapsedDrawerWidth : drawerWidth;

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "var(--color-sidebar)", color: "white", borderRight: "1px solid rgba(255,255,255,.06)" }}>
      <Stack direction="row" sx={{ minHeight: 58, px: 1, justifyContent: compactSidebar ? "center" : "flex-end", alignItems: "center" }}>
        <Tooltip title={compactSidebar ? "展開" : "縮小"}>
          <IconButton aria-label={compactSidebar ? "展開" : "縮小"} onClick={() => setDesktopCollapsed((collapsed) => !collapsed)} sx={{ display: { xs: "none", md: "inline-flex" }, color: "rgba(255,255,255,.72)" }}>
            <MenuOpenRounded sx={{ transform: compactSidebar ? "rotate(180deg)" : "none", transition: "transform .18s ease" }} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />
      <Box sx={{ px: compactSidebar ? 1 : 1.5, py: 2.5, flex: 1 }}>
        <Typography sx={{ display: compactSidebar ? "none" : "block", px: 1.5, mb: 1, color: "rgba(255,255,255,.45)", fontSize: 11, fontWeight: 800, letterSpacing: ".12em" }}>工作區</Typography>
        <List disablePadding>
          {navItems.map(([label, Icon]) => (
            <ListItemButton
              key={label}
              selected={activePage === label}
              onClick={() => { setActivePage(label); setMobileOpen(false); }}
              aria-label={label}
              sx={{
                borderRadius: 2,
                justifyContent: compactSidebar ? "center" : "flex-start",
                px: compactSidebar ? 1 : 1.5,
                mb: .6,
                py: 1.1,
                color: activePage === label ? "white" : "rgba(255,255,255,.72)",
                transition: "all .18s ease",
                "&.Mui-selected": {
                  bgcolor: "var(--color-primary)",
                  color: "white",
                  boxShadow: "0 4px 14px rgba(235, 113, 74, 0.35)",
                  "&:hover": { bgcolor: "var(--color-primary-dark)" }
                },
                "&:hover": { bgcolor: "rgba(255,255,255,.08)", color: "white" }
              }}
            >
              <ListItemIcon sx={{ minWidth: compactSidebar ? 0 : 40, color: "inherit" }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText sx={{ display: compactSidebar ? "none" : "block" }} primary={<Typography sx={{ fontSize: 14, fontWeight: activePage === label ? 700 : 600 }}>{label}</Typography>} />
              {!compactSidebar && activePage === label && <ChevronRightRounded sx={{ fontSize: 18 }} />}
            </ListItemButton>
          ))}
        </List>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />
      <Stack direction="row" spacing={1.2} sx={{ p: compactSidebar ? 1.5 : 2, alignItems: "center", justifyContent: compactSidebar ? "center" : "flex-start" }}>
        <Avatar src={user.image} alt={user.name} sx={{ width: 38, height: 38, bgcolor: "var(--color-primary)", color: "white", fontWeight: 700 }}>{user.name.slice(0, 1)}</Avatar>
        <Box sx={{ display: compactSidebar ? "none" : "block", flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700 }}>{user.name}</Typography>
          <Typography sx={{ color: "rgba(255,255,255,.50)", fontSize: 11 }} noWrap>{user.email}</Typography>
        </Box>
        <Tooltip title="登出">
          <Box component="form" action={signOutFromDashboard} sx={{ display: compactSidebar ? "none" : "block" }}>
            <IconButton type="submit" aria-label="登出" size="small" sx={{ color: "rgba(255,255,255,.60)", "&:hover": { color: "#f09273", bgcolor: "rgba(255,255,255,.10)" } }}>
              <LogoutRounded fontSize="small" />
            </IconButton>
          </Box>
        </Tooltip>
      </Stack>
    </Box>
  );

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <Box component="nav" aria-label="主要導覽" sx={{ width: { md: sidebarWidth }, flexShrink: { md: 0 }, transition: "width .18s ease" }}>
          <Drawer variant={desktop ? "permanent" : "temporary"} open={desktop || mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ "& .MuiDrawer-paper": { width: sidebarWidth, border: 0, transition: "width .18s ease" } }}>{drawer}</Drawer>
        </Box>
        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <Stack component="header" direction="row" spacing={2} sx={{ height: 76, px: { xs: 2, sm: 3.5 }, bgcolor: "white", borderBottom: "1px solid #eee5e1", position: "sticky", top: 0, zIndex: 10, alignItems: "center" }}>
            {!desktop && <IconButton aria-label="開啟選單" onClick={() => setMobileOpen(true)}><MenuRounded /></IconButton>}
          </Stack>
          <Box sx={{ p: { xs: 2, sm: 3.5, lg: 4 }, maxWidth: 1540, mx: "auto" }}>
            {activePage === "併單管理" ? (
              <OrderMergeView />
            ) : activePage === "訂單管理" ? (
              <OrdersView />
            ) : activePage === "商品管理" ? (
              <ProductsView />
            ) : activePage === "總覽" ? (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 3.5 }}>
                  <Box><Typography component="h1" sx={{ fontFamily: "var(--font-display)", fontSize: { xs: 26, sm: 30 }, fontWeight: 700, letterSpacing: "-.03em" }}>{activePage}</Typography><Typography color="text.secondary" sx={{ fontSize: 14.5, mt: 0.5 }}>早安，{user.name}。這是目前最新的營運概況。</Typography></Box>
                  <Button variant="outlined" startIcon={<CalendarMonthRounded />} sx={{ alignSelf: { xs: "flex-start", sm: "center" }, borderColor: "#e5d8d2", color: "#44403c", bgcolor: "white" }}>2026 年 8 月</Button>
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2.25, mb: 2.25 }}>
                  {metrics.map(([label, value, delta, tone]) => (
                    <Paper key={label} elevation={0} sx={{ p: 2.5, border: "1px solid #eee5e1", borderRadius: 3 }}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}><Box><Typography color="text.secondary" sx={{ fontSize: 13.5, fontWeight: 600 }}>{label}</Typography><Typography sx={{ mt: 1.1, fontSize: 25, fontWeight: 850 }}>{value}</Typography></Box><Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 2.2, color: tone, bgcolor: `${tone}12` }}><TrendingUpRounded /></Box></Stack>
                      <Stack direction="row" spacing={.8} sx={{ mt: 1.6 }}><Typography sx={{ color: "#027a48", fontSize: 12.5, fontWeight: 750 }}>{delta}</Typography><Typography color="text.secondary" sx={{ fontSize: 12 }}>較上月</Typography></Stack>
                    </Paper>
                  ))}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.65fr) minmax(300px, .85fr)" }, gap: 2.25, mb: 2.25 }}>
                  <Paper elevation={0} sx={{ p: { xs: 2.2, sm: 3 }, border: "1px solid #eee5e1", borderRadius: 3 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mb: 3 }}><Box><Typography sx={{ fontWeight: 800, fontSize: 17 }}>營收趨勢</Typography><Typography color="text.secondary" sx={{ fontSize: 12.5 }}>每日淨營收（新台幣）</Typography></Box><Select size="small" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ fontSize: 12.5 }}><MenuItem value="近 12 天">近 12 天</MenuItem><MenuItem value="本月">本月</MenuItem><MenuItem value="本季">本季</MenuItem></Select></Stack>
                    <Box sx={{ height: 238, display: "flex", alignItems: "flex-end", gap: { xs: .65, sm: 1.4 }, borderBottom: "1px solid #eee5e1" }}>{bars.map((value, index) => <Tooltip key={index} title={`NT$ ${(value * 1020).toLocaleString()}`}><Box sx={{ flex: 1, height: `${value}%`, minWidth: 8, borderRadius: "6px 6px 2px 2px", background: index === bars.length - 1 ? "linear-gradient(180deg, #d65730, #f09273)" : "#fde4dc" }} /></Tooltip>)}</Box>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1.2 }}><Typography color="text.secondary" sx={{ fontSize: 10.5 }}>8/19</Typography><Typography color="text.secondary" sx={{ fontSize: 10.5 }}>8/23</Typography><Typography color="text.secondary" sx={{ fontSize: 10.5 }}>8/27</Typography><Typography color="text.secondary" sx={{ fontSize: 10.5 }}>今日</Typography></Stack>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 3, border: "1px solid #eee5e1", borderRadius: 3 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 17 }}>通路表現</Typography><Typography color="text.secondary" sx={{ fontSize: 12.5, mb: 3.5 }}>本月營收貢獻</Typography>
                    <Stack spacing={3.2}>{channels.map(([label, value, amount, color]) => <Box key={label}><Stack direction="row" sx={{ justifyContent: "space-between", mb: 1.1 }}><Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{label}</Typography><Typography color="text.secondary" sx={{ fontSize: 13 }}>{amount}</Typography></Stack><LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 8, bgcolor: "#f2f4f7", "& .MuiLinearProgress-bar": { borderRadius: 8, bgcolor: color } }} /></Box>)}</Stack>
                    <Divider sx={{ my: 3 }} /><Stack direction="row" sx={{ justifyContent: "space-between" }}><Box><Typography color="text.secondary" sx={{ fontSize: 12 }}>平均客單價</Typography><Typography sx={{ fontSize: 19, fontWeight: 800 }}>NT$ 2,840</Typography></Box><Box sx={{ textAlign: "right" }}><Typography color="text.secondary" sx={{ fontSize: 12 }}>退貨率</Typography><Typography sx={{ fontSize: 19, fontWeight: 800 }}>1.24%</Typography></Box></Stack>
                  </Paper>
                </Box>
                <Paper elevation={0} sx={{ border: "1px solid #eee5e1", borderRadius: 3, overflow: "hidden" }}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", px: { xs: 2, sm: 3 }, py: 2.3 }}><Box><Typography sx={{ fontWeight: 800, fontSize: 17 }}>最新訂單</Typography><Typography color="text.secondary" sx={{ fontSize: 12.5 }}>今日共 186 筆訂單</Typography></Box><Button size="small" endIcon={<ChevronRightRounded />} onClick={() => setActivePage("訂單管理")}>查看全部</Button></Stack>
                  <Divider />
                  <TableContainer><Table sx={{ minWidth: 700 }}><TableHead><TableRow sx={{ bgcolor: "#fcfaf9" }}>{["訂單編號", "客戶", "金額", "狀態", "時間", ""].map((header) => <TableCell key={header} sx={{ color: "#78716c", fontSize: 12, fontWeight: 700 }}>{header}</TableCell>)}</TableRow></TableHead><TableBody>{orders.map(([id, customer, amount, status, time]) => <TableRow key={id} hover><TableCell sx={{ fontWeight: 750, color: "#44403c" }}>{id}</TableCell><TableCell><Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}><Avatar sx={{ width: 30, height: 30, bgcolor: "#fde4dc", color: "#d65730", fontSize: 12 }}>{customer.slice(0, 1)}</Avatar><Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{customer}</Typography></Stack></TableCell><TableCell sx={{ fontWeight: 650 }}>{amount}</TableCell><TableCell><Chip label={status} size="small" sx={{ ...statusStyle(status), fontWeight: 700, fontSize: 11.5 }} /></TableCell><TableCell sx={{ color: "#78716c" }}>{time}</TableCell><TableCell align="right"><IconButton aria-label={`查看訂單 ${id}`} size="small"><MoreHorizRounded /></IconButton></TableCell></TableRow>)}</TableBody></Table></TableContainer>
                </Paper>
              </>
            ) : (
              <Paper elevation={0} sx={{ p: 6, border: "1px solid #eee5e1", borderRadius: 3, textAlign: "center" }}>
                <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, mb: 1 }}>{activePage}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  這個模組功能開發中，敬請期待。
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

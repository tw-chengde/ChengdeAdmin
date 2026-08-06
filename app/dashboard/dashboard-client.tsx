"use client";

import MenuRounded from "@mui/icons-material/MenuRounded";
import { Box, CssBaseline, IconButton, Paper, Stack, ThemeProvider, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { appTheme } from "@/app/theme";
import { useDashboardViewModel } from "@/app/hooks/useDashboardViewModel";
import type { PageId } from "@/app/types/dashboard";
import DashboardSidebar from "./dashboard-sidebar";
import { navItems } from "./nav-items";
import OverviewView from "./overview-view";
import OrderMergeView from "./order-merge-view";
import OrdersView from "./orders-view";
import ProductsView from "./products-view";

function ComingSoon({ label }: { label: string }) {
  return (
    <Paper elevation={0} sx={{ p: 6, border: "1px solid #eee5e1", borderRadius: 3, textAlign: "center" }}>
      <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, mb: 1 }}>{label}</Typography>
      <Typography color="text.secondary" sx={{ fontSize: 14 }}>這個模組功能開發中，敬請期待。</Typography>
    </Paper>
  );
}

export default function DashboardClient({ user }: { user: { name: string; email: string; image?: string } }) {
  const {
    mobileOpen,
    setMobileOpen,
    setDesktopCollapsed,
    activePage,
    navigateTo,
    desktop,
    compactSidebar,
  } = useDashboardViewModel();

  const pageContent: Record<PageId, ReactNode> = {
    overview: <OverviewView />,
    orders: <OrdersView />,
    merge: <OrderMergeView />,
    products: <ProductsView />,
    customers: <ComingSoon label={navItems.find((item) => item.id === "customers")!.label} />,
    reports: <ComingSoon label={navItems.find((item) => item.id === "reports")!.label} />,
  };

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <DashboardSidebar
          user={user}
          desktop={desktop}
          compactSidebar={compactSidebar}
          mobileOpen={mobileOpen}
          activePage={activePage}
          onNavigate={navigateTo}
          onCloseMobile={() => setMobileOpen(false)}
          onToggleCollapsed={() => setDesktopCollapsed((collapsed) => !collapsed)}
        />
        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            component="header"
            direction="row"
            spacing={2}
            sx={{ height: 76, px: { xs: 2, sm: 3.5 }, bgcolor: "white", borderBottom: "1px solid #eee5e1", position: "sticky", top: 0, zIndex: 10, alignItems: "center" }}
          >
            {!desktop && (
              <IconButton aria-label="開啟選單" onClick={() => setMobileOpen(true)}>
                <MenuRounded />
              </IconButton>
            )}
          </Stack>
          <Box sx={{ p: { xs: 2, sm: 3.5, lg: 4 }, maxWidth: 1540, mx: "auto" }}>
            {pageContent[activePage]}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

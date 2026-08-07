"use client";

import MenuRounded from "@mui/icons-material/MenuRounded";
import { Box, CssBaseline, IconButton, Stack, ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";
import { appTheme } from "@/app/theme";
import { useDashboardViewModel } from "@/app/hooks/useDashboardViewModel";
import type { PageId } from "@/app/types/dashboard";
import DashboardSidebar from "./dashboard-sidebar";
import OrderMergeView from "./order-merge-view";
import OrdersView from "./orders-view";
import { PlatformSettingsProvider } from "./platform-settings-context";
import PlatformsView from "./platforms-view";
import ProductsView from "./products-view";

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
    orders: <OrdersView />,
    merge: <OrderMergeView />,
    products: <ProductsView />,
    settings: <PlatformsView />,
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
            <PlatformSettingsProvider>{pageContent[activePage]}</PlatformSettingsProvider>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

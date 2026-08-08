"use client";

import MenuRounded from "@mui/icons-material/MenuRounded";
import { Box, CssBaseline, IconButton, Stack, ThemeProvider, useMediaQuery } from "@mui/material";
import { useState, type ReactNode } from "react";
import { appTheme } from "@/app/theme";
import DashboardSidebar from "./dashboard-sidebar";

interface DashboardShellProps {
  user: { name: string; email: string; image?: string };
  children: ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const desktop = useMediaQuery(appTheme.breakpoints.up("md"));
  const compactSidebar = desktop && desktopCollapsed;

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <DashboardSidebar
          user={user}
          desktop={desktop}
          compactSidebar={compactSidebar}
          mobileOpen={mobileOpen}
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
              <IconButton aria-label="開啟導覽" onClick={() => setMobileOpen(true)}>
                <MenuRounded />
              </IconButton>
            )}
          </Stack>
          <Box sx={{ p: { xs: 2, sm: 3.5, lg: 4 }, maxWidth: 1540, mx: "auto" }}>{children}</Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
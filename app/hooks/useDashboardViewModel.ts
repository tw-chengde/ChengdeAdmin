import { useState } from "react";
import { useMediaQuery } from "@mui/material";
import { appTheme } from "@/app/theme";
import type { PageId } from "@/app/types/dashboard";

export function useDashboardViewModel() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [period, setPeriod] = useState("近 12 天");
  const desktop = useMediaQuery(appTheme.breakpoints.up("md"));
  const compactSidebar = desktop && desktopCollapsed;

  const navigateTo = (page: PageId) => {
    setActivePage(page);
    setMobileOpen(false);
  };

  return {
    mobileOpen,
    setMobileOpen,
    desktopCollapsed,
    setDesktopCollapsed,
    activePage,
    navigateTo,
    period,
    setPeriod,
    desktop,
    compactSidebar,
  };
}

"use client";

import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuOpenRounded from "@mui/icons-material/MenuOpenRounded";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { signOutFromDashboard } from "@/app/actions";
import { navItems } from "./nav-items";

const drawerWidth = 252;
const collapsedDrawerWidth = 72;

export default function DashboardSidebar({
  user,
  desktop,
  compactSidebar,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
  className,
}: {
  user: { name: string; email: string; image?: string };
  desktop: boolean;
  compactSidebar: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const sidebarWidth = compactSidebar ? collapsedDrawerWidth : drawerWidth;

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "var(--color-sidebar)",
        color: "white",
        borderRight: "1px solid rgba(255,255,255,.06)",
      }}
    >
      <Stack
        direction="row"
        sx={{ minHeight: 58, px: 1, justifyContent: compactSidebar ? "center" : "flex-end", alignItems: "center" }}
      >
        <Tooltip title={compactSidebar ? "展開" : "縮小"}>
          <IconButton
            aria-label={compactSidebar ? "展開" : "縮小"}
            onClick={onToggleCollapsed}
            sx={{ display: { xs: "none", md: "inline-flex" }, color: "rgba(255,255,255,.72)" }}
          >
            <MenuOpenRounded sx={{ transform: compactSidebar ? "rotate(180deg)" : "none", transition: "transform .18s ease" }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

      <Box sx={{ px: compactSidebar ? 1 : 1.5, py: 2.5, flex: 1 }}>
        <Typography
          sx={{ display: compactSidebar ? "none" : "block", px: 1.5, mb: 1, color: "rgba(255,255,255,.45)", fontSize: 11, fontWeight: 800, letterSpacing: ".12em" }}
        >
          工作區
        </Typography>
        <List disablePadding>
          {navItems.map(({ href, label, icon: Icon }) => {
            const activePage = pathname === href;
            return (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              selected={activePage}
              onClick={onCloseMobile}
              aria-current={activePage ? "page" : undefined}
              aria-label={label}
              sx={{
                borderRadius: 2,
                justifyContent: compactSidebar ? "center" : "flex-start",
                px: compactSidebar ? 1 : 1.5,
                mb: 0.6,
                py: 1.1,
                color: activePage ? "white" : "rgba(255,255,255,.72)",
                transition: "all .18s ease",
                "&.Mui-selected": {
                  bgcolor: "var(--color-primary)",
                  color: "white",
                  boxShadow: "0 4px 14px rgba(235, 113, 74, 0.35)",
                  "&:hover": { bgcolor: "var(--color-primary-dark)" },
                },
                "&:hover": { bgcolor: "rgba(255,255,255,.08)", color: "white" },
              }}
            >
              <ListItemIcon sx={{ minWidth: compactSidebar ? 0 : 40, color: "inherit" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                sx={{ display: compactSidebar ? "none" : "block" }}
                primary={<Typography sx={{ fontSize: 14, fontWeight: activePage ? 700 : 600 }}>{label}</Typography>}
              />
              {!compactSidebar && activePage && <ChevronRightRounded sx={{ fontSize: 18 }} />}
            </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

      <Stack direction="row" spacing={1.2} sx={{ p: compactSidebar ? 1.5 : 2, alignItems: "center", justifyContent: compactSidebar ? "center" : "flex-start" }}>
        <Avatar src={user.image} alt={user.name} sx={{ width: 38, height: 38, bgcolor: "var(--color-primary)", color: "white", fontWeight: 700 }}>
          {user.name.slice(0, 1)}
        </Avatar>
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
    <Box
      component="nav"
      aria-label="主要導覽"
      className={className}
      sx={{ width: { md: sidebarWidth }, flexShrink: { md: 0 }, transition: "width .18s ease" }}
    >
      <Drawer
        variant={desktop ? "permanent" : "temporary"}
        open={desktop || mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{ "& .MuiDrawer-paper": { width: sidebarWidth, border: 0, transition: "width .18s ease" } }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

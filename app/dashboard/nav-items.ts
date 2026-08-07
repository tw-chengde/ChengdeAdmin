import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import LocalMallRounded from "@mui/icons-material/LocalMallRounded";
import MergeTypeRounded from "@mui/icons-material/MergeTypeRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import type { NavItem } from "@/app/types/dashboard";

export const navItems: NavItem[] = [
  { id: "products", label: "商品管理", icon: Inventory2Rounded },
  { id: "merge", label: "併單管理", icon: MergeTypeRounded },
  { id: "orders", label: "訂單管理", icon: LocalMallRounded },
  { id: "settings", label: "設定", icon: SettingsRounded },
];

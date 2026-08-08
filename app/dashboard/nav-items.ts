import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import LocalMallRounded from "@mui/icons-material/LocalMallRounded";
import MergeTypeRounded from "@mui/icons-material/MergeTypeRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";

export const navItems = [
  { href: "/dashboard/products", label: "商品管理", icon: Inventory2Rounded },
  { href: "/dashboard/merge", label: "併單管理", icon: MergeTypeRounded },
  { href: "/dashboard/orders", label: "訂單管理", icon: LocalMallRounded },
  { href: "/dashboard/settings", label: "設定", icon: SettingsRounded },
];

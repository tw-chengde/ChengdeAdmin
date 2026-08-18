import DashboardRounded from "@mui/icons-material/DashboardRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import LocalMallRounded from "@mui/icons-material/LocalMallRounded";
import LocalShippingRounded from "@mui/icons-material/LocalShippingRounded";
import MergeTypeRounded from "@mui/icons-material/MergeTypeRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";

export const navItems = [
  { href: "/dashboard/overview", label: "營運總覽", icon: DashboardRounded },
  { href: "/dashboard/products", label: "商品管理", icon: Inventory2Rounded },
  { href: "/dashboard/merge", label: "併單管理", icon: MergeTypeRounded },
  { href: "/dashboard/shipping", label: "出貨管理", icon: LocalShippingRounded },
  { href: "/dashboard/orders", label: "訂單查詢", icon: LocalMallRounded },
  { href: "/dashboard/settings", label: "設定", icon: SettingsRounded },
];

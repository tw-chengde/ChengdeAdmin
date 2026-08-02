import {
  AssessmentRounded,
  DashboardRounded,
  Inventory2Rounded,
  LocalMallRounded,
  MergeTypeRounded,
  PeopleAltRounded,
} from "@mui/icons-material";
import type { NavItem } from "@/app/types/dashboard";

export const navItems: NavItem[] = [
  { id: "overview", label: "總覽", icon: DashboardRounded },
  { id: "products", label: "商品管理", icon: Inventory2Rounded },
  { id: "merge", label: "併單管理", icon: MergeTypeRounded },
  { id: "orders", label: "訂單管理", icon: LocalMallRounded },
  { id: "customers", label: "客戶管理", icon: PeopleAltRounded },
  { id: "reports", label: "分析報表", icon: AssessmentRounded },
];

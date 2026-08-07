import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";

export type PageId = "orders" | "merge" | "products" | "settings";

export interface NavItem {
  id: PageId;
  label: string;
  icon: ComponentType<SvgIconProps>;
}

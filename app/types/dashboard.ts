import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";

export type PageId = "overview" | "orders" | "merge" | "customers" | "products" | "reports";

export interface NavItem {
  id: PageId;
  label: string;
  icon: ComponentType<SvgIconProps>;
}

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
  tone: string;
}

export interface DashboardOrder {
  id: string;
  customer: string;
  amount: string;
  status: "已完成" | "處理中" | "待付款" | "已取消";
  time: string;
}

export interface DashboardChannel {
  label: string;
  value: number;
  amount: string;
  color: string;
}

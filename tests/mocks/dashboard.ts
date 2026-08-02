import type { DashboardChannel, DashboardMetric, DashboardOrder } from "@/app/types/dashboard";

export const dashboardMetrics: DashboardMetric[] = [
  { label: "本月營收", value: "NT$ 1,284,600", delta: "+12.8%", tone: "#eb714a" },
  { label: "今日訂單", value: "186", delta: "+8.2%", tone: "#d65730" },
  { label: "新客戶", value: "428", delta: "+18.4%", tone: "#f09273" },
  { label: "轉換率", value: "3.68%", delta: "+0.6%", tone: "#b4532f" },
];

export const dashboardOrders: DashboardOrder[] = [
  { id: "#CD-2841", customer: "林怡君", amount: "NT$ 8,420", status: "已完成", time: "10:42" },
  { id: "#CD-2840", customer: "陳冠宇", amount: "NT$ 3,680", status: "處理中", time: "10:18" },
  { id: "#CD-2839", customer: "許雅雯", amount: "NT$ 12,900", status: "待付款", time: "09:56" },
  { id: "#CD-2838", customer: "黃品皓", amount: "NT$ 5,260", status: "已完成", time: "09:21" },
  { id: "#CD-2837", customer: "吳欣蓉", amount: "NT$ 2,150", status: "已取消", time: "08:45" },
];

export const dashboardChannels: DashboardChannel[] = [
  { label: "官方網站", value: 68, amount: "NT$ 873,500", color: "#eb714a" },
  { label: "品牌門市", value: 47, amount: "NT$ 284,200", color: "#d65730" },
  { label: "合作通路", value: 31, amount: "NT$ 126,900", color: "#f09273" },
];

export const revenueBars = [34, 46, 40, 58, 48, 65, 72, 68, 79, 74, 88, 94];

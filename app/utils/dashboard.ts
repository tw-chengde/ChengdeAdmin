import type { DashboardOrder } from "@/app/types/dashboard";

export function statusStyle(status: DashboardOrder["status"]) {
  switch (status) {
    case "已完成":
      return { color: "#027a48", bgcolor: "#ecfdf3" };
    case "處理中":
      return { color: "#d65730", bgcolor: "#fff8f5" };
    case "待付款":
      return { color: "#b54708", bgcolor: "#fffaeb" };
    case "已取消":
      return { color: "#b42318", bgcolor: "#fef3f2" };
  }
}

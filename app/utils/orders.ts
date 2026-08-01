import { OrderItem } from "@/app/types/order";

export function statusStyle(status: OrderItem["status"]) {
  switch (status) {
    case "待發貨":
      return { color: "#b54708", bgcolor: "#fffaeb", border: "1px solid #fedf89" };
    case "配送中":
      return { color: "#175cd3", bgcolor: "#eff8ff", border: "1px solid #b2ddff" };
    case "已完成":
      return { color: "#027a48", bgcolor: "#ecfdf3", border: "1px solid #abefc6" };
    case "待付款":
      return { color: "#c01048", bgcolor: "#fff1f3", border: "1px solid #fecdca" };
    case "退貨申請":
      return { color: "#b42318", bgcolor: "#fef3f2", border: "1px solid #fecdca" };
    case "已取消":
      return { color: "#344054", bgcolor: "#f2f4f7", border: "1px solid #eaecf0" };
    default:
      return { color: "#344054", bgcolor: "#f2f4f7", border: "1px solid #eaecf0" };
  }
}

export function channelStyle(channelCode: OrderItem["channelCode"]) {
  if (channelCode === "MOMO_MAIN") {
    return {
      name: "MOMO 購物網",
      color: "#ec008c",
      bgcolor: "rgba(236, 0, 140, 0.08)",
      borderColor: "rgba(236, 0, 140, 0.25)",
      gradient: "linear-gradient(135deg, #ec008c, #d80073)",
    };
  }
  return {
    name: "Mo 店+",
    color: "#ff6b00",
    bgcolor: "rgba(255, 107, 0, 0.08)",
    borderColor: "rgba(255, 107, 0, 0.25)",
    gradient: "linear-gradient(135deg, #ff6b00, #ea580c)",
  };
}

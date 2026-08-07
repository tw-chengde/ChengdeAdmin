import { mockOrders } from "@/tests/mocks/orders";
import type { PlatformConnector } from "./connector";

/** MOMO 購物網。尚無 API 文件，fetchOrders 暫時回傳 mock 資料中屬於本平台的訂單。 */
export const momoConnector: PlatformConnector = {
  definition: {
    code: "MOMO_MAIN",
    name: "MOMO 購物網",
    logo: "/images/momo.png",
    logoObjectFit: "contain",
    color: "#ec008c",
    bgcolor: "rgba(236, 0, 140, 0.08)",
    borderColor: "rgba(236, 0, 140, 0.25)",
    gradient: "linear-gradient(135deg, #ec008c, #d80073)",
  },
  async fetchOrders() {
    return mockOrders.filter((o) => o.channelCode === "MOMO_MAIN");
  },
};

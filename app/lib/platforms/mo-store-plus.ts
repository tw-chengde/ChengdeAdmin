import { mockOrders } from "@/tests/mocks/orders";
import type { PlatformConnector } from "./connector";

/** Mo 店+。尚無 API 文件，fetchOrders 暫時回傳 mock 資料中屬於本平台的訂單。 */
export const moStorePlusConnector: PlatformConnector = {
  definition: {
    code: "MO_STORE_PLUS",
    name: "Mo 店+",
    logo: "/images/mo-store.jpg",
    logoObjectFit: "cover",
    color: "#ff6b00",
    bgcolor: "rgba(255, 107, 0, 0.08)",
    borderColor: "rgba(255, 107, 0, 0.25)",
    gradient: "linear-gradient(135deg, #ff6b00, #ea580c)",
  },
  async fetchOrders() {
    return mockOrders.filter((o) => o.channelCode === "MO_STORE_PLUS");
  },
};

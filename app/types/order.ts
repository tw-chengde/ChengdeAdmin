export interface OrderItem {
  id: string;
  channel: "MOMO 購物網" | "Mo 店+";
  channelCode: "MOMO_MAIN" | "MO_STORE_PLUS";
  orderNo: string;
  channelOrderNo: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  address: string;
  items: { name: string; spec: string; qty: number; price: number }[];
  totalAmount: number;
  paymentMethod: string;
  status: "待付款" | "待發貨" | "配送中" | "已完成" | "已取消" | "退貨申請";
  logistics: string;
  trackingNo: string;
  createdAt: string;
  note?: string;
}

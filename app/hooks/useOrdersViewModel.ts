import { useState, useMemo } from "react";
import { OrderItem } from "@/app/types/order";
import type { PlatformCode } from "@/app/lib/platforms/types";

export type ChannelTab = "ALL" | PlatformCode;

export function useOrdersViewModel(initialOrders: OrderItem[]) {
  const [channelTab, setChannelTab] = useState<ChannelTab>("ALL");
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const filteredOrders = useMemo(() => {
    return initialOrders.filter((order) => {
      if (channelTab !== "ALL" && order.channelCode !== channelTab) return false;

      if (statusTab !== "ALL" && order.status !== statusTab) return false;

      if (searchQuery.trim()) {
        // 需與上面的判斷一致取 trim 後的值，否則貼上帶空白的訂單編號會搜不到。
        const q = searchQuery.trim().toLowerCase();
        const matchNo = order.orderNo.toLowerCase().includes(q);
        const matchChannelNo = order.channelOrderNo.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchPhone = order.customerPhone.includes(q);
        const matchItem = order.items.some((i) => i.name.toLowerCase().includes(q));
        return matchNo || matchChannelNo || matchName || matchPhone || matchItem;
      }

      return true;
    });
  }, [initialOrders, channelTab, statusTab, searchQuery]);

  const stats = useMemo(() => {
    const channelFiltered =
      channelTab === "ALL" ? initialOrders : initialOrders.filter((o) => o.channelCode === channelTab);

    const totalOrders = channelFiltered.length;
    const totalRevenue = channelFiltered.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingShipment = channelFiltered.filter((o) => o.status === "待發貨").length;
    const rmaCount = channelFiltered.filter((o) => o.status === "退貨申請" || o.status === "已取消").length;

    return { totalOrders, totalRevenue, pendingShipment, rmaCount };
  }, [initialOrders, channelTab]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
  };

  return {
    // State
    channelTab,
    setChannelTab,
    statusTab,
    setStatusTab,
    searchQuery,
    setSearchQuery,
    selectedOrder,
    setSelectedOrder,
    copiedText,

    // Derived State
    filteredOrders,
    stats,

    // Handlers
    copyToClipboard,
  };
}

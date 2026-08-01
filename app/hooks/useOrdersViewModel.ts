import { useState, useMemo } from "react";
import { OrderItem } from "@/app/types/order";

export type ChannelTab = "ALL" | "MOMO_MAIN" | "MO_STORE_PLUS";

export function useOrdersViewModel(initialOrders: OrderItem[]) {
  const [channelTab, setChannelTab] = useState<ChannelTab>("ALL");
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 900);
  };

  const filteredOrders = useMemo(() => {
    return initialOrders.filter((order) => {
      if (channelTab === "MOMO_MAIN" && order.channelCode !== "MOMO_MAIN") return false;
      if (channelTab === "MO_STORE_PLUS" && order.channelCode !== "MO_STORE_PLUS") return false;

      if (statusTab !== "ALL" && order.status !== statusTab) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
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
    const channelFiltered = initialOrders.filter((o) => {
      if (channelTab === "MOMO_MAIN") return o.channelCode === "MOMO_MAIN";
      if (channelTab === "MO_STORE_PLUS") return o.channelCode === "MO_STORE_PLUS";
      return true;
    });

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
    isSyncing,
    selectedOrder,
    setSelectedOrder,
    copiedText,

    // Derived State
    filteredOrders,
    stats,

    // Handlers
    handleSync,
    copyToClipboard,
  };
}

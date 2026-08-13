import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderItem } from "@/app/types/order";
import { filterOrders, orderStats, type ChannelTab, type OrderDateRange } from "@/app/utils/orders";

export type { ChannelTab, OrderDateRange };

const COPIED_FEEDBACK_MS = 1500;

/**
 * 訂單頁的 UI 狀態：通路分頁、關鍵字、詳情對話框與複製回饋。
 *
 * 篩選與統計本身是純運算，放在 `app/utils/orders.ts`，這裡只負責把畫面狀態接上去。
 * 日期不在這裡篩——那是送進平台 API 的查詢條件，由伺服器端負責。
 */
export function useOrdersViewModel(initialOrders: OrderItem[], initialChannelTab: ChannelTab = null) {
  const [channelTab, setChannelTab] = useState<ChannelTab>(initialChannelTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const filteredOrders = useMemo(
    () => filterOrders(initialOrders, { channelTab, searchQuery }),
    [initialOrders, channelTab, searchQuery],
  );

  const stats = useMemo(() => orderStats(initialOrders, channelTab), [initialOrders, channelTab]);

  // 卸載後再觸發的計時器會對已消失的元件 setState，要在這裡收掉。
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copyToClipboard = useCallback((text: string) => {
    // 剪貼簿權限被拒時不該讓整個頁面因為未處理的 rejection 而中斷；
    // 失敗就單純不顯示「已複製」。
    void navigator.clipboard.writeText(text).then(
      () => {
        setCopiedText(true);
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopiedText(false), COPIED_FEEDBACK_MS);
      },
      () => setCopiedText(false),
    );
  }, []);

  return {
    channelTab,
    setChannelTab,
    searchQuery,
    setSearchQuery,
    selectedOrder,
    setSelectedOrder,
    copiedText,
    filteredOrders,
    stats,
    copyToClipboard,
  };
}

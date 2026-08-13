import type { OrderItem } from "@/app/types/order";

/** 超商取貨的顯示文字：品牌 */
export function pickupStoreLabel(pickupStore: NonNullable<OrderItem["pickupStore"]>): string {
  return pickupStore.brand;
}

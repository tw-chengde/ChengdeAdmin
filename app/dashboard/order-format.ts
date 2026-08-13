import type { OrderItem } from "@/app/types/order";

/** 超商取貨的顯示文字：品牌 · 門市名稱（若有） */
export function pickupStoreLabel(pickupStore: NonNullable<OrderItem["pickupStore"]>): string {
  return pickupStore.name ? `${pickupStore.brand} · ${pickupStore.name}` : pickupStore.brand;
}

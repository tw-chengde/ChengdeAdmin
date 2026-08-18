import type { PlatformCode } from "@/app/lib/platforms/types";
import type { PickingGroup, PickingLine, PickingSheet, PickingSheetTotals } from "@/app/types/picking";
import { isPendingShipmentStatus, type OrderItem, type OrderLineItem } from "@/app/types/order";
import type { Product } from "@/app/types/product";
import type { ProductBinding } from "@/app/types/product-binding";
import { bindingKey, indexBindings } from "./product-bindings";

/**
 * 揀貨單彙總鍵，層層退化：單品編號（goodsdtCode）→ 商品編號＋規格 → 名稱＋規格。
 * 認不出編號的訂單仍要出現在揀貨單上，不能安靜消失。
 */
export function pickingLineKey(platformCode: string, item: OrderLineItem): string {
  if (item.goodsCode && item.goodsdtCode) return `${platformCode}:code:${item.goodsCode}:dt:${item.goodsdtCode}`;
  if (item.goodsdtCode) return `${platformCode}:dt:${item.goodsdtCode}:name:${item.name}:spec:${item.spec}`;
  if (item.goodsCode) return `${platformCode}:code:${item.goodsCode}:${item.spec}`;
  return `${platformCode}:name:${item.name}:${item.spec}`;
}

/**
 * 把待出貨訂單彙總成揀貨單：第一層以彙總鍵合併同一平台單品的數量與訂單數，
 * 第二層依 product_platform_bindings 併組成本地商品（跨平台合併）；
 * 對不到綁定（或綁定指向已刪除的商品）的平台商品各自成一組。
 */
export function buildPickingSheet(orders: OrderItem[], bindings: ProductBinding[], products: Product[]): PickingSheet {
  const lines = new Map<string, PickingLine>();

  for (const order of orders) {
    if (!isPendingShipmentStatus(order.status)) continue;
    for (const item of order.items) {
      const key = pickingLineKey(order.channelCode, item);
      const existing = lines.get(key);
      if (existing) {
        existing.totalQty += item.qty;
        if (!existing.orderNos.includes(order.orderNo)) existing.orderNos.push(order.orderNo);
        if (!existing.platformName && item.name) existing.platformName = item.name;
        if (!existing.spec && item.spec) existing.spec = item.spec;
        continue;
      }
      lines.set(key, {
        key,
        platformCode: order.channelCode,
        channelName: order.channel,
        goodsCode: item.goodsCode ?? null,
        goodsdtCode: item.goodsdtCode ?? null,
        platformName: item.name,
        spec: item.spec,
        totalQty: item.qty,
        orderNos: [order.orderNo],
      });
    }
  }

  const boundIndex = indexBindings(bindings);
  const productById = new Map(products.map((product) => [product.id, product]));
  const groups = new Map<string, PickingGroup>();

  for (const line of lines.values()) {
    const binding = line.goodsCode ? boundIndex.get(bindingKey(line.platformCode, line.goodsCode)) : undefined;
    let groupKey: string;
    let product: Product | null = null;
    let bindingOrphaned = false;
    let fallbackName = line.platformName;

    if (binding) {
      product = productById.get(binding.product_id) ?? null;
      if (product) {
        groupKey = `product:${product.id}`;
      } else {
        groupKey = `unbound:${line.platformCode}:${line.goodsCode}`;
        bindingOrphaned = true;
        fallbackName = binding.goods_name || line.platformName;
      }
    } else {
      groupKey = `unbound:${line.key}`;
    }

    const existing = groups.get(groupKey);
    if (existing) {
      existing.lines.push(line);
      if (!existing.fallbackName && fallbackName) existing.fallbackName = fallbackName;
      continue;
    }
    groups.set(groupKey, { key: groupKey, product, bindingOrphaned, fallbackName, lines: [line], totalQty: 0, orderCount: 0, shortage: false });
  }

  const result = [...groups.values()];
  for (const group of result) {
    group.totalQty = group.lines.reduce((sum, line) => sum + line.totalQty, 0);
    group.orderCount = new Set(group.lines.flatMap((line) => line.orderNos)).size;
    group.shortage = group.product !== null && group.product.stock < group.totalQty;
    group.lines.sort((a, b) => a.spec.localeCompare(b.spec));
  }

  // 已綁定組按本地商品代號升冪；未綁定（含綁定孤兒）排最後，組間按名稱排序求穩定輸出。
  result.sort((a, b) => {
    if (a.product && b.product) return a.product.code.localeCompare(b.product.code);
    if (a.product) return -1;
    if (b.product) return 1;
    return a.fallbackName.localeCompare(b.fallbackName);
  });

  const totals: PickingSheetTotals = {
    groupCount: result.length,
    lineCount: lines.size,
    totalQty: result.reduce((sum, group) => sum + group.totalQty, 0),
    orderCount: new Set(result.flatMap((group) => group.lines.flatMap((line) => line.orderNos))).size,
    unboundGroupCount: result.filter((group) => group.product === null).length,
    shortageGroupCount: result.filter((group) => group.shortage).length,
  };

  return { groups: result, totals };
}

/** 揀貨單裡尚未綁定本地商品的平台商品清單，供頁面提示與快捷建立綁定使用。 */
export function unboundPlatformProducts(sheet: PickingSheet): Array<{ platformCode: PlatformCode; goodsCode: string; name: string }> {
  const seen = new Set<string>();
  const result: Array<{ platformCode: PlatformCode; goodsCode: string; name: string }> = [];

  for (const group of sheet.groups) {
    if (group.product !== null) continue;
    for (const line of group.lines) {
      if (!line.goodsCode) continue;
      const dedupeKey = `${line.platformCode}:${line.goodsCode}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      result.push({ platformCode: line.platformCode, goodsCode: line.goodsCode, name: group.fallbackName });
    }
  }

  return result;
}

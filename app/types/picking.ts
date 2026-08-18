import type { PlatformCode } from "@/app/lib/platforms/types";
import type { Product } from "./product";

/** 揀貨單的一列＝一個平台單品（商品 + 規格）。 */
export interface PickingLine {
  key: string;
  platformCode: PlatformCode;
  channelName: string;
  goodsCode: string | null;
  goodsdtCode: string | null;
  /** 平台原始品名；未綁定時畫面顯示這個。 */
  platformName: string;
  spec: string;
  totalQty: number;
  orderNos: string[];
}

/** 揀貨單的一組＝一個本地商品（跨平台合併）；對不到綁定時每個平台商品自成一組。 */
export interface PickingGroup {
  key: string;
  /** null＝未綁定，或綁定指向已刪除的本地商品。 */
  product: Product | null;
  /** 綁定存在但本地商品讀不到。 */
  bindingOrphaned: boolean;
  fallbackName: string;
  lines: PickingLine[];
  totalQty: number;
  orderCount: number;
  /** product 為 null 時恆 false（無從判斷）。 */
  shortage: boolean;
}

export interface PickingSheetTotals {
  groupCount: number;
  lineCount: number;
  totalQty: number;
  orderCount: number;
  unboundGroupCount: number;
  shortageGroupCount: number;
}

export interface PickingSheet {
  groups: PickingGroup[];
  totals: PickingSheetTotals;
}

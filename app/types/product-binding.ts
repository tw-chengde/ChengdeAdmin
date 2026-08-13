import type { PlatformProduct } from "@/app/lib/platforms/product";
import type { PlatformCode } from "@/app/lib/platforms/types";
import type { Product } from "./product";

/** D1 中的一筆綁定紀錄，欄位維持資料庫的 snake_case。 */
export interface ProductBinding {
  id: number;
  product_id: number;
  platform_code: PlatformCode;
  goods_code: string;
  goods_name: string | null;
  created_at: string;
}

/** 建立或變更綁定的輸入，維持 camelCase（與 products 的輸入型別一致）。 */
export interface BindProductInput {
  productId: number;
  platformCode: PlatformCode;
  goodsCode: string;
  goodsName?: string;
}

export interface BindingMutationResult {
  ok: boolean;
  error?: string;
}

/** 某個平台的商品查詢失敗。單一平台失敗不應讓整頁空白，因此以資料形式回傳。 */
export interface PlatformFetchFailure {
  platformCode: PlatformCode;
  message: string;
}

/** 併單管理頁一次載入所需的全部資料。 */
export interface MergeBindingPageData {
  platformProducts: PlatformProduct[];
  failures: PlatformFetchFailure[];
  bindings: ProductBinding[];
  products: Product[];
}

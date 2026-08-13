import type { PlatformCode } from "./types";

/** 平台商品的上下架狀態（各平台原始值正規化後）。 */
export type ListingStatus = "LISTED" | "DELISTED";

/** 商品狀態查詢條件。ALL＝全部、LISTED＝上架中、DELISTED＝已下架。 */
export type ListingStatusFilter = "ALL" | ListingStatus;

/**
 * 查詢平台商品時的條件，由併單管理頁的搜尋列送入，各 connector 再轉成自家平台的參數。
 *
 * 一次只查一個平台：畫面上同時間也只看得到一個分頁的商品，
 * 併查其他平台只會讓使用者多等最慢的那一個。
 */
export interface PlatformProductQuery {
  platformCode: PlatformCode;
  listingStatus: ListingStatusFilter;
}

/**
 * 平台端的一筆商品，統一在「商品」(goodsCode) 層級。
 *
 * momo 與 mo店+ 都是「商品 → 單品(goodsdtCode)」兩層結構，但併單綁定只做到商品層，
 * 因此各平台的 mapper 負責把底下的單品彙總成這裡的 salePrice / skuCount。
 */
export interface PlatformProduct {
  /** 全域唯一鍵，格式 `<platformCode>:<goodsCode>`；同時當作 React key 與綁定索引。 */
  id: string;
  platformCode: PlatformCode;
  goodsCode: string;
  name: string;
  /** 廠商自訂的原廠編號，用來自動比對本地 products.code。平台未提供時為 null。 */
  entpGoodsNo: string | null;
  /** 售價；多規格商品取最低價。平台未提供時為 null。 */
  salePrice: number | null;
  /** 上下架狀態；平台回傳無法辨識的值時為 null。 */
  listingStatus: ListingStatus | null;
  /** 底下的單品數，用來提示「此商品有 N 個規格」。 */
  skuCount: number;
}

import { moStorePlusAuthValueFromEnvironment, platformProxyFromEnvironment } from "./config";
import { postJson } from "./platform-http";
import { resolvePlatformRequest, type PlatformProxyOptions } from "./platform-proxy";

const MO_STORE_PLUS_BASE_URL = "https://api3p.momo.com.tw";
const ORDER_QUERY_PATH = "/VendorApi/OrderQuery";
const GOODS_QUERY_PATH = "/VendorApi/GoodsQueryByMethod";
/** 規格書的 maxPerPage 範圍是 100～10000 筆/頁；兩支查詢共用同一組限制。 */
const ORDER_MAX_PER_PAGE = 1000;
const GOODS_MAX_PER_PAGE = 1000;
/** 安全上限：平台若回傳異常的 totalOrders / totalGoods，最多只翻這麼多頁就停手。 */
const ORDER_MAX_PAGES = 20;
const GOODS_MAX_PAGES = 20;

export interface MoStorePlusClientOptions extends PlatformProxyOptions {
  authValue?: string;
  fetchImpl?: typeof fetch;
}

/**
 * OrderQuery 回傳的一張訂單（listOrder）。
 *
 * 規格書上訂單層只有 orderNo / errorMessage / listItem 三個欄位——收件人、金額、
 * 日期、物流全都在品項層（listItem）。過去這裡還宣告了 customerName、totalAmount、
 * createdAt、trackingNo 等訂單層欄位，平台並不會回傳，mapper 讀它們永遠是 undefined。
 */
export interface MoStorePlusOrderRecord {
  orderNo?: string;
  errorMessage?: string | null;
  listItem?: MoStorePlusOrderItemRecord[];
  [key: string]: unknown;
}

/** OrderQuery 回傳的訂單品項（listItem）。 */
export interface MoStorePlusOrderItemRecord {
  orderSeq?: string;
  itemStatus?: string;
  goodsNo?: string;
  goodsdtCode?: string;
  goodsName?: string;
  goodsInfo1?: string | null;
  goodsInfo2?: string | null;
  entpGoodsNo?: string | null;
  quantity?: number;
  /** 訂單金額：此品項的小計，不是單價。 */
  orderAmount?: number;
  customerName?: string;
  receiverName?: string;
  receiverAddress?: string;
  deliveryType?: string | null;
  deliveryCompany?: string | null;
  deliveryNo?: string | null;
  planShipDate?: string;
  shipDate?: string | null;
  lastProcDate?: string;
  [key: string]: unknown;
}

export interface MoStorePlusOrderQueryOptions {
  from?: Date;
  to?: Date;
  maxPerPage?: number;
  /** 安全上限：平台若回傳異常的 totalOrders，最多只翻這麼多頁就停手。 */
  maxPages?: number;
  /** OrderQuery 的 orderStatus；All=全部。 */
  orderStatus?: string;
  /** OrderQuery 的 deliveryType；All=全部、Home=宅配、Store=超取、ThirdParty=第三方物流。 */
  deliveryType?: string;
  /**
   * OrderQuery 的 storeDeliveryType（超取分類）。規格書的列舉是取件流向而非超商品牌：
   * All=全部、StoreToStoreShip=店到店配送、StoreToStoreReturn=店到店退貨、
   * WarehouseToStoreShip=倉到店配送、StoreToWarehouseReturn=店到倉退貨。
   * 依超商品牌篩選是 momo SCM 的 dely_gb 才有的能力，mo店+ 沒有。
   */
  storeDeliveryType?: string;
}
export interface MoStorePlusGoodsdtRecord {
  goodsdtCode?: string;
  goodsdtInfo?: string;
  entpGoodsNo?: string;
  quantity?: number | null;
  salePrice?: number | null;
  custPrice?: number | null;
  dtSaleStatus?: string;
  [key: string]: unknown;
}

/** GoodsQueryByMethod 回傳的商品，底下帶有 listGoodsdt 單品陣列。 */
export interface MoStorePlusGoodsRecord {
  goodsCode?: string;
  goodsName?: string;
  saleStatus?: string;
  salePrice?: number | null;
  custPrice?: number | null;
  applyDate?: string;
  listGoodsdt?: MoStorePlusGoodsdtRecord[];
  [key: string]: unknown;
}

interface MoStorePlusOrderResponse {
  totalOrders?: number;
  pageIndex?: number;
  maxPerPage?: number;
  errorMessage?: string;
  listOrder?: MoStorePlusOrderRecord[];
  [key: string]: unknown;
}

interface MoStorePlusGoodsResponse {
  totalGoods?: number;
  pageIndex?: number;
  maxPerPage?: number;
  errorMessage?: string;
  result?: MoStorePlusGoodsRecord[];
  [key: string]: unknown;
}

export interface MoStorePlusGoodsQueryOptions {
  maxPerPage?: number;
  maxPages?: number;
  applyDate?: string;
  /** 上下架狀態：All=全部（預設）、StartSelling=只查上架、StopSelling=只查下架 */
  saleStatus?: string;
}

function taipeiDateParts(date: Date, withTime: boolean) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit" as const, minute: "2-digit" as const, second: "2-digit" as const, hourCycle: "h23" as const } : {}),
  }).formatToParts(date);
  return Object.fromEntries(values.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

/** OrderQuery 的 fromDate / toDate；規格書接受 `yyyy/MM/dd`。 */
function taipeiTodayDateString(date = new Date()): string {
  const parts = taipeiDateParts(date, false);
  return `${parts.year}/${parts.month}/${parts.day}`;
}

/**
 * GoodsQueryByMethod 的 applyDate（商品價格生效日）。
 * 規格書指定格式為 `yyyy-MM-dd HH:mm:ss`，與訂單查詢的日期格式不同。
 */
function taipeiDateTimeString(date = new Date()): string {
  const parts = taipeiDateParts(date, true);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Server-only Mo店+ transport. The endpoint and supplied credential remain deployment configuration. */
export class MoStorePlusClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: MoStorePlusClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  static fromEnvironment(): MoStorePlusClient {
    return new MoStorePlusClient({
      authValue: moStorePlusAuthValueFromEnvironment(),
      // mo店+ 同樣要求供應商登記固定出口 IP，與 momo 共用同一個 Cloud Run proxy。
      ...platformProxyFromEnvironment(),
    });
  }

  /**
   * 兩個查詢共用的請求組裝：授權標頭加上（必要時的）proxy 標頭。
   * 授權標頭名稱依規格書寫死為 Authorization。
   */
  private request(path: string): { url: string; headers: Headers } {
    const { url, proxyHeaders } = resolvePlatformRequest(MO_STORE_PLUS_BASE_URL, path, this.options);
    const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
    if (this.options.authValue) {
      headers.set("Authorization", this.options.authValue);
    }
    for (const [name, value] of Object.entries(proxyHeaders)) headers.set(name, value);
    return { url, headers };
  }

  /**
   * 查詢訂單。此 API 有分頁，逐頁抓到 totalOrders 為止；
   * 過去只送 pageIndex 1 而且沒讀 totalOrders，超過一頁的訂單會被靜默丟掉。
   */
  async fetchOrders(options: MoStorePlusOrderQueryOptions = {}): Promise<MoStorePlusOrderRecord[]> {
    const to = options.to ?? new Date();
    const from = options.from ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    const maxPerPage = options.maxPerPage ?? ORDER_MAX_PER_PAGE;
    const maxPages = options.maxPages ?? ORDER_MAX_PAGES;
    const { url, headers } = this.request(ORDER_QUERY_PATH);

    const collected: MoStorePlusOrderRecord[] = [];
    let totalOrders = Number.POSITIVE_INFINITY;

    for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
      const payload = await postJson<MoStorePlusOrderResponse | MoStorePlusOrderRecord[]>({
        url,
        headers,
        label: "mo店+ 訂單查詢",
        fetchImpl: this.fetchImpl,
        body: {
          pageIndex,
          maxPerPage,
          listOrderNo: [],
          queryDateType: "OrderDate",
          fromDate: taipeiTodayDateString(from),
          toDate: taipeiTodayDateString(to),
          deliveryType: options.deliveryType ?? "All",
          storeDeliveryType: options.storeDeliveryType ?? "All",
          orderStatus: options.orderStatus ?? "All",
          goodsNo: "",
          goodsName: "",
          entpGoodsNo: "",
          customerName: "",
          orderChangeAddrStatus: "All",
        },
      });

      // 規格書的回應是物件；容許平台直接回傳陣列時當成單一頁處理。
      if (Array.isArray(payload)) return payload;
      if (!payload || typeof payload !== "object") throw new Error("mo店+ 訂單查詢回傳格式不包含訂單陣列。");
      if (payload.errorMessage) throw new Error(`mo店+ 訂單查詢失敗：${payload.errorMessage}`);
      if (!Array.isArray(payload.listOrder)) throw new Error("mo店+ 訂單查詢回傳格式不包含訂單陣列。");

      const rows = payload.listOrder;
      collected.push(...rows);
      if (typeof payload.totalOrders === "number" && Number.isFinite(payload.totalOrders)) totalOrders = payload.totalOrders;
      // 空頁、未滿一頁或已取滿總數都代表沒有下一頁了。
      if (rows.length === 0 || rows.length < maxPerPage || collected.length >= totalOrders) break;
    }

    return collected;
  }
  /**
   * 查詢全部上架/下架商品。此 API 有分頁，逐頁抓到 totalGoods 為止；
   * maxPages 是防呆上限，避免平台回傳異常的 totalGoods 造成無限迴圈。
   */
  async fetchGoods(options: MoStorePlusGoodsQueryOptions = {}): Promise<MoStorePlusGoodsRecord[]> {
    const maxPerPage = options.maxPerPage ?? GOODS_MAX_PER_PAGE;
    const maxPages = options.maxPages ?? GOODS_MAX_PAGES;
    const applyDate = options.applyDate ?? taipeiDateTimeString();
    const saleStatus = options.saleStatus ?? "All";
    const { url, headers } = this.request(GOODS_QUERY_PATH);

    const collected: MoStorePlusGoodsRecord[] = [];
    let totalGoods = Number.POSITIVE_INFINITY;

    for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
      const payload = await this.postGoodsQuery(url, headers, { queryMethod: "All", saleStatus, applyDate, pageIndex, maxPerPage });
      if (payload.errorMessage) throw new Error(`mo店+ 商品查詢失敗：${payload.errorMessage}`);

      const rows = Array.isArray(payload.result) ? payload.result : [];
      collected.push(...rows);
      if (typeof payload.totalGoods === "number" && Number.isFinite(payload.totalGoods)) totalGoods = payload.totalGoods;
      // 空頁、未滿一頁或已取滿總數都代表沒有下一頁了。
      if (rows.length === 0 || rows.length < maxPerPage || collected.length >= totalGoods) break;
    }

    return collected;
  }

  private postGoodsQuery(url: string, headers: Headers, body: Record<string, unknown>): Promise<MoStorePlusGoodsResponse> {
    return postJson<MoStorePlusGoodsResponse>({ url, headers, body, label: "mo店+ 商品查詢", fetchImpl: this.fetchImpl });
  }
}

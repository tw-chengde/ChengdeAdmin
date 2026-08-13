import { moStorePlusAuthValueFromEnvironment, platformProxyFromEnvironment } from "./config";
import { postJson } from "./platform-http";
import { resolvePlatformRequest, type PlatformProxyOptions } from "./platform-proxy";

const MO_STORE_PLUS_BASE_URL = "https://api3p.momo.com.tw";
const ORDER_QUERY_PATH = "/VendorApi/OrderQuery";
const GOODS_QUERY_PATH = "/VendorApi/GoodsQueryByMethod";
const ORDER_MAX_PER_PAGE = 100;
/** 規格書上限為 1000 筆/頁。 */
const GOODS_MAX_PER_PAGE = 1000;
/** 安全上限：平台若回傳異常的 totalGoods，最多只翻這麼多頁就停手。 */
const GOODS_MAX_PAGES = 20;

export interface MoStorePlusClientOptions extends PlatformProxyOptions {
  authValue?: string;
  fetchImpl?: typeof fetch;
}

export interface MoStorePlusOrderRecord {
  id?: string | number;
  orderNo?: string;
  order_no?: string;
  customerName?: string;
  customer_name?: string;
  address?: string;
  receiverAddress?: string;
  createdAt?: string;
  created_at?: string;
  status?: string;
  logistics?: string;
  trackingNo?: string;
  tracking_no?: string;
  items?: Array<{ name?: string; productName?: string; spec?: string; quantity?: number; qty?: number; price?: number }>;
  listItem?: MoStorePlusOrderItemRecord[];
  totalAmount?: number;
  total_amount?: number;
  [key: string]: unknown;
}

/** GoodsQueryByMethod 回傳的單品（規格）。 */
export interface MoStorePlusOrderItemRecord {
  itemStatus?: string;
  goodsName?: string;
  goodsInfo1?: string;
  goodsInfo2?: string;
  quantity?: number;
  orderAmount?: number;
  deliveryType?: string;
  deliveryCompany?: string;
  deliveryNo?: string;
  planShipDate?: string;
  lastProcDate?: string;
  [key: string]: unknown;
}

export interface MoStorePlusOrderQueryOptions {
  from?: Date;
  to?: Date;
  maxPerPage?: number;
  /** OrderQuery 的 orderStatus；All=全部。 */
  orderStatus?: string;
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

function taipeiTodayDateString(date = new Date()): string {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const parts = Object.fromEntries(values.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}/${parts.month}/${parts.day}`;
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

  async fetchOrders(options: MoStorePlusOrderQueryOptions = {}): Promise<MoStorePlusOrderRecord[]> {
    const to = options.to ?? new Date();
    const from = options.from ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    const maxPerPage = options.maxPerPage ?? ORDER_MAX_PER_PAGE;
    const { url, headers } = this.request(ORDER_QUERY_PATH);

    const payload = await postJson<unknown>({
      url,
      headers,
      label: "mo店+ 訂單查詢",
      fetchImpl: this.fetchImpl,
      body: {
        pageIndex: 1,
        maxPerPage,
        listOrderNo: [],
        queryDateType: "OrderDate",
        fromDate: taipeiTodayDateString(from),
        toDate: taipeiTodayDateString(to),
        deliveryType: "All",
        storeDeliveryType: "All",
        orderStatus: options.orderStatus ?? "All",
        goodsNo: "",
        goodsName: "",
        entpGoodsNo: "",
        customerName: "",
        orderChangeAddrStatus: "All",
      },
    });

    if (Array.isArray(payload)) return payload as MoStorePlusOrderRecord[];
    if (payload && typeof payload === "object") {
      const container = payload as Record<string, unknown>;
      if (typeof container.errorMessage === "string" && container.errorMessage) {
        throw new Error(`mo店+ 訂單查詢失敗：${container.errorMessage}`);
      }
      for (const key of ["orders", "data", "result", "resultData", "listOrder"]) {
        if (Array.isArray(container[key])) return container[key] as MoStorePlusOrderRecord[];
      }
    }
    throw new Error("mo店+ 訂單查詢回傳格式不包含訂單陣列。");
  }
  /**
   * 查詢全部上架/下架商品。此 API 有分頁，逐頁抓到 totalGoods 為止；
   * maxPages 是防呆上限，避免平台回傳異常的 totalGoods 造成無限迴圈。
   */
  async fetchGoods(options: MoStorePlusGoodsQueryOptions = {}): Promise<MoStorePlusGoodsRecord[]> {
    const maxPerPage = options.maxPerPage ?? GOODS_MAX_PER_PAGE;
    const maxPages = options.maxPages ?? GOODS_MAX_PAGES;
    const applyDate = options.applyDate ?? taipeiTodayDateString();
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
      // 平台回傳空頁或已取滿總數就停止；rows 為空時再翻頁也只會拿到同樣的空結果。
      if (rows.length === 0 || collected.length >= totalGoods) break;
    }

    return collected;
  }

  private postGoodsQuery(url: string, headers: Headers, body: Record<string, unknown>): Promise<MoStorePlusGoodsResponse> {
    return postJson<MoStorePlusGoodsResponse>({ url, headers, body, label: "mo店+ 商品查詢", fetchImpl: this.fetchImpl });
  }
}

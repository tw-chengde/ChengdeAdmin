import {
  momoScmCredentialsFromEnvironment,
  platformProxyFromEnvironment,
  type MomoScmCredentials,
} from "./config";
import { postJson } from "./platform-http";
import { resolvePlatformRequest, type PlatformProxyOptions } from "./platform-proxy";

const MOMO_SCM_BASE_URL = "https://scmapi.momoshop.com.tw";
const ORDER_SERVLET_PATH = "/OrderServlet.do";
const GOODS_SERVLET_PATH = "/GoodsServlet.do";

export type { MomoScmCredentials };

export interface MomoScmClientOptions extends PlatformProxyOptions {
  credentials: MomoScmCredentials;
  fetchImpl?: typeof fetch;
}

export interface MomoUnshippedOrderQuery {
  from: Date;
  to: Date;
  receiver?: string;
  goodsCode?: string;
  orderNo?: string;
  entpGoodsNo?: string;
  orderGb?: string;
}

export interface MomoStoreOrderQuery extends MomoUnshippedOrderQuery {
  delyGb: "21" | "27" | "28" | "29" | "2A" | "2B";
  special?: "Y" | "N";
}

export interface MomoThirdPartyOrderQuery extends MomoUnshippedOrderQuery {
  delyGb: "61" | "62" | "63" | "65";
  delyTemp: "01" | "02" | "03";
}

export interface MomoShippingStoreOrderQuery extends MomoUnshippedOrderQuery {
  delyGb: "21" | "27" | "28" | "29" | "2A" | "2B";
  status: "1" | "2" | "3" | "4" | "5";
}

export interface MomoShippingThirdPartyOrderQuery extends MomoUnshippedOrderQuery {
  logistics: "61" | "62" | "63" | "65";
  status: "1" | "2";
}

/** Common fields returned by the unshipped convenience-store and 3PL APIs. */
export interface MomoUnshippedOrder {
  itemNo?: string;
  completeOrderNo: string;
  goodsName?: string;
  goodsDtInfo?: string;
  goodsCode?: string;
  syslast?: string | number;
  salePrice?: string | number;
  receiverMask?: string;
  Receiver?: string;
  receiverAddrMask?: string;
  storeIdName?: string;
  orderDelyGbName?: string;
  lastPricDate?: string;
  msg?: string;
  msgNote?: string;
  scm_msg?: string;
  [key: string]: unknown;
}

/** Fields shared by the SCM「出貨中訂單」超商取貨與第三方物流查詢。 */
export interface MomoShippingOrder {
  completeOrderNo: string;
  goods_name?: string;
  goodsdt_info?: string;
  syslast?: string | number;
  receiver_mask?: string;
  cust_name_mask?: string;
  storeId?: string;
  storeDeliveryType?: MomoShippingStoreOrderQuery["delyGb"];
  /**
   * 這一列的出貨中細狀態名稱。
   *
   * 只有 sendingStoresQuery 與 sendingThirdQuery 這兩支出貨中查詢會回傳，
   * 未出貨查詢沒有，因此 MomoUnshippedOrder 不會有對應欄位。
   */
  code_name?: string;
  storeName?: string;
  dely_gbStr?: string;
  slip_no?: string;
  create_date?: string;
  scm_msg?: string;
  msg_note?: string;
  [key: string]: unknown;
}

export interface MomoGoodsQuery {
  /** 商品編號，模糊比對 */
  goodsCode?: string;
  /** 商品名稱，模糊比對 */
  goodsName?: string;
  /** 商品原廠編號，模糊比對 */
  entpGoodsNo?: string;
  /** 銷售狀況：空字串=全部、00=進行、11=暫時中斷 */
  saleGb?: string;
}

/** queryGoodsBasicData 的一列＝一個單品，同一個 GOODS_CODE 會出現多列。 */
export interface MomoGoodsBasicRecord {
  GOODS_CODE: string;
  GOODS_NAME: string;
  GOODSDT_CODE: string;
  GOODSDT_INFO: string;
  ENTP_GOODS_NO: string;
  SALEGB_NAME: string;
  SALE_PRICE: string;
  [key: string]: unknown;
}

interface MomoScmResponse<TRow = unknown> {
  dataList?: TRow[];
  ERROR?: string;
  basicCheckMsgList?: string[];
  [key: string]: unknown;
}

/** SCM 的查詢條件一律以台北時間的「日期 + 時 + 分」三個欄位分開送出。 */
interface TaipeiDateTime {
  /** `YYYY/MM/DD` */
  date: string;
  hour: string;
  minute: string;
}

function taipeiDateTime(date: Date): TaipeiDateTime {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const parts = Object.fromEntries(values.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${parts.year}/${parts.month}/${parts.day}`, hour: parts.hour, minute: parts.minute };
}

function asErrorMessage(response: MomoScmResponse<unknown>): string | null {
  if (typeof response.ERROR === "string" && response.ERROR) return response.ERROR;
  if (Array.isArray(response.basicCheckMsgList) && response.basicCheckMsgList.length) return response.basicCheckMsgList.join("；");
  return null;
}

/**
 * Server-only client for the SCM APIs. momo requires the supplier to allowlist
 * the egress IP, so production traffic can optionally be routed through the
 * existing Cloud Run proxy. Credentials are never imported by client modules.
 */
export class MomoScmClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: MomoScmClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  static fromEnvironment(): MomoScmClient {
    return new MomoScmClient({
      credentials: momoScmCredentialsFromEnvironment(),
      ...platformProxyFromEnvironment(),
    });
  }

  async queryUnshippedStoreOrders(query: MomoStoreOrderQuery): Promise<MomoUnshippedOrder[]> {
    const from = taipeiDateTime(query.from);
    const to = taipeiDateTime(query.to);
    return this.queryDataList<MomoUnshippedOrder>(ORDER_SERVLET_PATH, "unsendStoresQuery", "超商取貨未出貨訂單查詢", {
      stores_fr_dd: from.date,
      stores_fr_hh: from.hour,
      stores_fr_mm: from.minute,
      stores_to_dd: to.date,
      stores_to_hh: to.hour,
      stores_to_mm: to.minute,
      stores_receiver: query.receiver ?? "",
      stores_goodsCode: query.goodsCode ?? "",
      stores_orderNo: query.orderNo ?? "",
      stores_entpGoodsNo: query.entpGoodsNo ?? "",
      stores_special: query.special ?? "N",
      dely_gb: query.delyGb,
    });
  }

  async queryUnshippedThirdPartyOrders(query: MomoThirdPartyOrderQuery): Promise<MomoUnshippedOrder[]> {
    const from = taipeiDateTime(query.from);
    const to = taipeiDateTime(query.to);
    return this.queryDataList<MomoUnshippedOrder>(ORDER_SERVLET_PATH, "unsendThirdQuery", "三方未出貨訂單查詢", {
      third_fr_dd: from.date,
      third_fr_hh: from.hour,
      third_fr_mm: from.minute,
      third_to_dd: to.date,
      third_to_hh: to.hour,
      third_to_mm: to.minute,
      third_receiver: query.receiver ?? "",
      third_goodsCode: query.goodsCode ?? "",
      third_orderNo: query.orderNo ?? "",
      third_entpGoodsNo: query.entpGoodsNo ?? "",
      third_orderGb: query.orderGb ?? "",
      third_delyGb: query.delyGb,
      third_delyTemp: query.delyTemp,
    });
  }

  async queryShippingStoreOrders(query: MomoShippingStoreOrderQuery): Promise<MomoShippingOrder[]> {
    const from = taipeiDateTime(query.from);
    const to = taipeiDateTime(query.to);
    const orders = await this.queryDataList<MomoShippingOrder>(
      ORDER_SERVLET_PATH,
      "sendingStoresQuery",
      "超商取貨出貨中訂單查詢",
      {
        fromDate: from.date,
        fromHour: from.hour,
        fromMinute: from.minute,
        toDate: to.date,
        toHour: to.hour,
        toMinute: to.minute,
        qryGoodsCode: query.goodsCode ?? "",
        receiver: query.receiver ?? "",
        orderNo: query.orderNo ?? "",
        entpGoodsCode: query.entpGoodsNo ?? "",
        status: query.status,
        dely_gb: query.delyGb,
      },
    );
    // 回應本身不含超商別，補上查詢時用的 delyGb，mapper 才能對應到超商品牌。
    return orders.map((order) => ({ ...order, storeDeliveryType: query.delyGb }));
  }

  async queryShippingThirdPartyOrders(query: MomoShippingThirdPartyOrderQuery): Promise<MomoShippingOrder[]> {
    const from = taipeiDateTime(query.from);
    const to = taipeiDateTime(query.to);
    return this.queryDataList<MomoShippingOrder>(ORDER_SERVLET_PATH, "sendingThirdQuery", "三方出貨中訂單查詢", {
      fromDate: from.date,
      fromHour: from.hour,
      fromMinute: from.minute,
      toDate: to.date,
      toHour: to.hour,
      toMinute: to.minute,
      qryGoodsCode: query.goodsCode ?? "",
      receiver: query.receiver ?? "",
      status: query.status,
      orderNo: query.orderNo ?? "",
      logistics: query.logistics,
      entpGoodsCode: query.entpGoodsNo ?? "",
    });
  }

  /**
   * 商品簡易查詢。四個條件皆為選填，全部留空即查詢全部商品；此 API 沒有分頁機制，
   * 一次回傳全部結果，且不含庫存欄位。
   */
  async queryGoodsBasicData(query: MomoGoodsQuery = {}): Promise<MomoGoodsBasicRecord[]> {
    return this.queryDataList<MomoGoodsBasicRecord>(GOODS_SERVLET_PATH, "queryGoodsBasicData", "商品查詢", {
      goodsCode: query.goodsCode ?? "",
      goodsName: query.goodsName ?? "",
      entpGoodsNo: query.entpGoodsNo ?? "",
      saleGB: query.saleGb ?? "",
    });
  }

  /**
   * SCM 每個查詢 API 的形狀都一樣：POST 一組 doAction + loginInfo + sendInfo，
   * 回應把錯誤放在 ERROR / basicCheckMsgList，結果放在 dataList。
   * 差異只有 doAction 與 sendInfo 的欄位命名，因此收斂到這裡。
   */
  private async queryDataList<T>(
    path: string,
    doAction: string,
    /** 錯誤訊息用的查詢名稱，例如「商品查詢」。 */
    queryName: string,
    sendInfo: Record<string, unknown>,
  ): Promise<T[]> {
    const response = await this.post<MomoScmResponse<T>>(path, {
      doAction,
      loginInfo: this.loginInfo(),
      sendInfo,
    });

    const error = asErrorMessage(response);
    if (error) throw new Error(`momo SCM ${queryName}失敗：${error}`);
    return Array.isArray(response.dataList) ? response.dataList : [];
  }

  async confirmCompanyShipment(sendInfoList: Array<Record<string, string>>): Promise<MomoScmResponse> {
    return this.post<MomoScmResponse>(ORDER_SERVLET_PATH, {
      doAction: "unsendCompanyConfirm",
      loginInfo: this.loginInfo(),
      sendInfoList,
    });
  }

  private loginInfo() {
    const { entpId, entpCode, entpPassword, otpBackNo } = this.options.credentials;
    return { entpID: entpId, entpCode, entpPwd: entpPassword, otpBackNo };
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const { url, proxyHeaders } = resolvePlatformRequest(MOMO_SCM_BASE_URL, path, this.options);
    const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json" });
    for (const [name, value] of Object.entries(proxyHeaders)) headers.set(name, value);

    return postJson<T>({ url, headers, body, label: "momo SCM", fetchImpl: this.fetchImpl });
  }
}

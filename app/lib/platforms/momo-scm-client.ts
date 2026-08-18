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
const SHIP_TYPE_LIST_PATH = "/order/shipType/getShipTypeList.scm";

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
  goodsDtCode?: string;
  entpGoodsNo?: string;
  /** 個人識別碼；併箱分組鍵之一（P3-4a）。 */
  custId?: string;
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

export interface MomoOrderGoodsStatisticsQuery {
  from: Date;
  to: Date;
  entpGoodsCode?: string;
}

/**
 * orderGoodsStatisticsQuery 的一列＝一個單品在查詢區間內的接單彙總。
 *
 * 規格書上這支 API 只回傳以下七個欄位——特別注意它**沒有日期也沒有售價**：
 * 金額只能用 buyPrice（進價含稅）估算，而且無法拆出每日走勢。
 */
export interface MomoOrderGoodsStatisticsRecord {
  goodsCode?: string;
  entpGoodsNo?: string;
  goodsName?: string;
  goodsDtInfo?: string;
  /** 進價(含稅)。這支 API 不回傳售價。 */
  buyPrice?: string | number;
  /** 數量(訂購-取消) */
  orderQty?: string | number;
  /** 客退數量 */
  claimQty?: string | number;
  [key: string]: unknown;
}

/** 出貨用包材，平台語彙（`shipTypeStr` / `packTypeStr` / `packUnit`）。 */
export interface MomoPackaging {
  shipTypeStr: string;
  packTypeStr: string;
  packUnit: string;
}

/** unsendStoresCombineBox / unsendThirdCombineBox 的 resultInfo（單一物件）。 */
export interface MomoCombineBoxResult {
  undoCnt?: string;
  undoList?: string[];
  combineOkCnt?: string;
  combineFailCnt?: string;
  combineFailList?: string[];
  combineUsedCnt?: string;
  combineUsedList?: string[];
}

/** 出貨確認的單筆結果；超商回傳陣列，第三方物流回傳單一物件。 */
export interface MomoFinishResult {
  undoCnt?: string;
  undoList?: string[];
  confirmOkCnt?: string;
  confirmOkList?: string[];
  confirmFailCnt?: string;
  confirmFailList?: string[];
  confirmRepeatCnt?: string;
  confirmRepeatList?: string[];
}

export interface MomoPrintPdfResult {
  undoCnt?: string;
  undoList?: string[];
  /** PDF 檔串流（base64）。 */
  pdfData?: string;
}

export interface MomoShipTypeOption {
  name: string;
  /** 原始欄位拼字為 `neewWeight`，保留照抄，避免與規格書比對時混淆。 */
  needsWeight: boolean;
  packTypes: string[];
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
   * 訂單商品接單統計查詢 (orderGoodsStatisticsQuery)。
   * 依日期區間統計接單數量與金額，主要用於營運總覽業績與商品銷售彙整。
   */
  async queryOrderGoodsStatistics(query: MomoOrderGoodsStatisticsQuery): Promise<MomoOrderGoodsStatisticsRecord[]> {
    const from = taipeiDateTime(query.from);
    const to = taipeiDateTime(query.to);
    return this.queryDataList<MomoOrderGoodsStatisticsRecord>(
      ORDER_SERVLET_PATH,
      "orderGoodsStatisticsQuery",
      "訂單商品接單統計查詢",
      {
        stDate: from.date,
        edDate: to.date,
        entpGoodsCode: query.entpGoodsCode ?? "",
        goodsCode: "",
      },
    );
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

  /** 超商取貨併箱（unsendStoresCombineBox）。boxYn 依 `planComboBoxes` 分組結果；規格書規定 remark5VStr 此處只能填「可出貨」。 */
  combineStoreBoxes(boxYnByOrderNo: Map<string, string>): Promise<MomoCombineBoxResult> {
    return this.postCombineBox("unsendStoresCombineBox", "超商取貨併箱", boxYnByOrderNo);
  }

  /** 第三方物流併箱（unsendThirdCombineBox）。欄位與超商取貨完全相同。 */
  combineThirdPartyBoxes(boxYnByOrderNo: Map<string, string>): Promise<MomoCombineBoxResult> {
    return this.postCombineBox("unsendThirdCombineBox", "第三方物流併箱", boxYnByOrderNo);
  }

  private async postCombineBox(doAction: string, actionName: string, boxYnByOrderNo: Map<string, string>): Promise<MomoCombineBoxResult> {
    const response = await this.post<MomoScmResponse<unknown> & { resultInfo?: MomoCombineBoxResult }>(ORDER_SERVLET_PATH, {
      doAction,
      loginInfo: this.loginInfo(),
      sendInfoList: [...boxYnByOrderNo.entries()].map(([completeOrderNo, boxYn]) => ({
        completeOrderNo,
        boxYn,
        remark5VStr: "可出貨",
      })),
    });
    const error = asErrorMessage(response);
    if (error) throw new Error(`momo SCM ${actionName}失敗：${error}`);
    return response.resultInfo ?? {};
  }

  /** 超商取貨出貨確認（unsendStoresFinish）。包材三欄必填。 */
  finishStoreShipment(orderNos: string[], packaging: MomoPackaging): Promise<MomoFinishResult[]> {
    return this.postFinish("unsendStoresFinish", "超商取貨出貨確認", orderNos, packaging);
  }

  /** 第三方物流出貨確認（unsendThirdFinish）。欄位與超商取貨完全相同。 */
  finishThirdPartyShipment(orderNos: string[], packaging: MomoPackaging): Promise<MomoFinishResult[]> {
    return this.postFinish("unsendThirdFinish", "第三方物流出貨確認", orderNos, packaging);
  }

  private async postFinish(
    doAction: string,
    actionName: string,
    orderNos: string[],
    packaging: MomoPackaging,
  ): Promise<MomoFinishResult[]> {
    const response = await this.post<MomoScmResponse<unknown> & { resultInfo?: MomoFinishResult | MomoFinishResult[] }>(ORDER_SERVLET_PATH, {
      doAction,
      loginInfo: this.loginInfo(),
      sendInfoList: orderNos.map((completeOrderNo) => ({
        completeOrderNo,
        remark5VStr: "可出貨",
        shipTypeStr: packaging.shipTypeStr,
        packTypeStr: packaging.packTypeStr,
        packUnit: packaging.packUnit,
      })),
    });
    const error = asErrorMessage(response);
    if (error) throw new Error(`momo SCM ${actionName}失敗：${error}`);
    if (Array.isArray(response.resultInfo)) return response.resultInfo;
    return response.resultInfo ? [response.resultInfo] : [];
  }

  /** 超商取貨列印標籤／明細（unsendStoresPrintPdf）。printType 在 body 最外層，不在 sendInfoList 裡。 */
  async printStoreLabels(orderNos: string[], printType: "label" | "dt" = "label"): Promise<MomoPrintPdfResult> {
    const response = await this.post<MomoScmResponse<unknown> & MomoPrintPdfResult>(ORDER_SERVLET_PATH, {
      doAction: "unsendStoresPrintPdf",
      printType,
      loginInfo: this.loginInfo(),
      sendInfoList: orderNos.map((completeOrderNo) => ({ completeOrderNo })),
    });
    const error = asErrorMessage(response);
    if (error) throw new Error(`momo SCM 超商取貨列印失敗：${error}`);
    return { undoCnt: response.undoCnt, undoList: response.undoList, pdfData: response.pdfData };
  }

  /**
   * 第三方物流列印（unsendThirdPrintPdf）。
   *
   * 訂單編號與超商取貨版相同，放在 `sendInfoList`；另以 `third_delyGb` 指定物流商。
   * 同一宅單號的訂單編號必須一併傳入，因此呼叫端會先依物流商分組。
   */
  async printThirdPartyLabels(
    delyGb: MomoThirdPartyOrderQuery["delyGb"],
    orderNos: string[],
    printType: "label" | "dt" | "all" = "label",
  ): Promise<MomoPrintPdfResult> {
    const response = await this.post<MomoScmResponse<unknown> & MomoPrintPdfResult>(ORDER_SERVLET_PATH, {
      doAction: "unsendThirdPrintPdf",
      printType,
      third_delyGb: delyGb,
      loginInfo: this.loginInfo(),
      sendInfoList: orderNos.map((completeOrderNo) => ({ completeOrderNo })),
    });
    const error = asErrorMessage(response);
    if (error) throw new Error(`momo SCM 第三方物流列印失敗：${error}`);
    return { undoCnt: response.undoCnt, undoList: response.undoList, pdfData: response.pdfData };
  }

  /** 取得配送類型／包材清單（`/order/shipType/getShipTypeList.scm`），驗證包材設定值用。此端點沒有 doAction。 */
  async queryShipTypes(): Promise<MomoShipTypeOption[]> {
    const response = await this.post<
      MomoScmResponse<{ name?: string; neewWeight?: boolean; subLevelList?: Array<{ name?: string }> }>
    >(SHIP_TYPE_LIST_PATH, { loginInfo: this.loginInfo() });
    const error = asErrorMessage(response);
    if (error) throw new Error(`momo SCM 配送類型清單查詢失敗：${error}`);
    return (response.dataList ?? []).map((item) => ({
      name: item.name ?? "",
      needsWeight: item.neewWeight ?? false,
      packTypes: (item.subLevelList ?? []).map((sub) => sub.name ?? ""),
    }));
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

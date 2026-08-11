# SCM API 廠商提問格式 (V1.0)

> **來源原檔**：`momo\API文件\SCM_API廠商提問格式_V1.0`  
> **說明**：由原始供應商文件轉換。當向 momo 團隊提出 API 相關問題時，請參考此格式提供完整的排查資訊。

---

## 一、須提供訊息

提出問題時，請儘可能包含以下 6 項資訊：

1. **API 文件名稱及方法名稱**
2. **傳入參數 JSON 格式**
3. **呼叫 API 時間**
4. **回傳錯誤訊息**
5. **錯誤訊息圖檔**
6. **其它問題**

---

## 二、提問範例

### 1. API 文件名稱及方法名稱
- **文件名稱**：`SCM_訂單API規格文件_V2.5.doc`
- **方法名稱**：`unsendCompanyQuery`

### 2. 傳入參數 JSON 格式
```json
{
  "doAction": "unsendCompanyQuery",
  "sendInfo": {
    "company_fr_dd": "2016/03/18",
    "company_fr_hh": "00",
    "company_fr_mm": "00",
    "company_to_dd": "2016/05/18",
    "company_to_hh": "23",
    "company_to_mm": "59",
    "company_receiver": "",
    "company_goodsCode": "",
    "company_orderNo": "",
    "company_entpGoodsNo": "",
    "company_orderGb": ""
  }
}
```

### 3. 呼叫 API 時間
`2019/05/13 11:22:30`

### 4. 回傳錯誤訊息
```json
{
  "resultInfo": {
    "failList": [
      "\t1801030018\t【閃閃金光金光閃閃有限公司TEST_2】石蓮花300公克±10\t[銷售單位別]欄位不可填寫"
    ],
    "failCnt": 1,
    "successCnt": 0,
    "totalCnt": 1
  }
}
```



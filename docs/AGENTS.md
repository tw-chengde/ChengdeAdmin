# Documentation & Integration Index (文件與平台整合索引)

本目錄包含 ChengdeAdmin 的第三方平台整合說明、OpenAPI 規格與供應商維運指南。AI Agent 與開發者在處理特定平台開發時，請優先參考以下對應文件：

---

## 1. 平台整合指南

紀錄各第三方平台的端點、驗證機制與核心程式進入點：

- **mo店+ (MO_STORE_PLUS)**
  - 網域：`https://api3p.momo.com.tw`
  - 驗證：`Authorization: Bearer TOKEN`
  - 程式實作：[mo-store-plus-client.ts](../app/lib/platforms/mo-store-plus-client.ts)
  - OpenAPI 規格：[mo-store-plus.openapi.json](./api/mo-store-plus.openapi.json)

- **momo SCM (MOMO_MAIN)**
  - 網域：`https://scmapi.momoshop.com.tw`
  - 驗證：`loginInfo.entpID`、`entpCode`、`entpPwd`、`otpBackNo`
  - 程式實作：[momo-scm-client.ts](../app/lib/platforms/momo-scm-client.ts)
  - OpenAPI 規格：[momo-scm.openapi.json](./api/momo-scm.openapi.json)

---

## 2. API 規格定義

- **[API 規格索引 README](./api/README.md)**
- **OpenAPI 3.1 規格檔**：
  - [mo-store-plus.openapi.json](./api/mo-store-plus.openapi.json)
  - [momo-scm.openapi.json](./api/momo-scm.openapi.json)

---

## 3. 供應商維運指南

- **[SCM API 串接常見問題 (FAQ)](./guides/momo-scm-faq.md)**
- **[SCM API 廠商提問格式](./guides/momo-scm-vendor-question-template.md)**
- **[SCM 倉庫代碼列表](./guides/momo-scm-warehouse-codes.md)**


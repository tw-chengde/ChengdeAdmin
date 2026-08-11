# API 規格索引 (API Specifications)

本目錄存放各平台 API 的 OpenAPI 3.1 規格檔案與相關補充文件。

---

## 1. momo SCM

[momo SCM OpenAPI 3.1 規格檔](./momo-scm.openapi.json) 整合了全部 19 份 momo SCM 供應商規範檔案，包含 110 個實體 HTTP 請求端點以及 47 個邏輯動作（例如多個功能共用 `OrderServlet.do` 並透過 `doAction` 區分）。

- **原始文件與摘要**：每份原始供應商文件均完整保留於 `x-source-documents` 標籤下，完整的欄位對照表、備註說明與 API 範例則收錄於 `x-source-extract`。

---

## 2. mo店+ (MO_STORE_PLUS)

[mo店+ OpenAPI 3.1 規格檔](./mo-store-plus.openapi.json) 收錄了 32 個已說明的 API 操作端點。

---

## 3. 非 HTTP 相關說明文件

- [momo SCM API 串接常見問題 (FAQ)](../guides/momo-scm-faq.md)
- [momo SCM API 廠商提問格式](../guides/momo-scm-vendor-question-template.md)
- [momo SCM 倉庫代碼列表](../guides/momo-scm-warehouse-codes.md)


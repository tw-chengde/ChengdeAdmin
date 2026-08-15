# API 規格索引 (API Specifications)

本目錄存放各平台 API 的 OpenAPI 3.0.3 規格檔案與相關補充文件。

---

## 1. momo SCM

[momo SCM OpenAPI 3.0.3 規格檔](./momo-scm.openapi.yaml) 整合了 momo SCM 供應商規範文件，包含 110 個 HTTP 端點與 263 個 component schema。

命名慣例：`Order<DoAction>Request` / `Order<DoAction>Response`、`Goods<DoAction>Request` / `Goods<DoAction>Response`，回應 schema 另帶 `x-doAction` 標記。

---

## 2. mo店+ (MO_STORE_PLUS)

[mo店+ OpenAPI 3.0.3 規格檔](./mo-store-plus.openapi.yaml) 收錄了 32 個已說明的 API 操作端點，萃取自規格書 v0.11.3（`20241007001.pdf`）。

---

## 3. 非 HTTP 相關說明文件

- [momo SCM API 串接常見問題 (FAQ)](../guides/momo-scm-faq.md)
- [momo SCM 倉庫代碼列表](../guides/momo-scm-warehouse-codes.md)

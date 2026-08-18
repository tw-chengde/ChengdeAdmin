# 誠得電商管理後台 (Chengde Admin)

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare_D1-blue)](https://developers.cloudflare.com/d1/)
[![MUI](https://img.shields.io/badge/UI-Material--UI-007FFF)](https://mui.com/)
[![Vitest](https://img.shields.io/badge/Testing-Vitest-6E9F18)](https://vitest.dev/)

> 一站式多電商通路營運管理系統，專為整合多平台訂單處理、跨平台智慧併單、揀貨出貨流程與商品數據所設計。

---

## 📌 核心業務價值

在多電商平台營運時（如 MOMO 購物網、MO 店+ 等），常面臨訂單分散、人工併單耗時、揀貨出貨容易出錯等問題。
**Chengde Admin** 提供統一的後台管理介面：

1. **多平台數據聚合**：統一拉取各通路（MOMO、MO 店+ 等）訂單與銷售統計，即時掌握全通路營運現況。
2. **揀貨與出貨作業**：產生跨平台合併揀貨單（Picking Sheet），支援批次列印出貨單與回傳平台出貨狀態。

---

## 🚀 系統架構

```mermaid
flowchart TD
    subgraph Client["瀏覽器端"]
        User["管理者 (Google Auth)"]
    end

    subgraph CF["Cloudflare Edge"]
        Worker["Next.js / vinext (Cloudflare Worker)"]
        D1[("Cloudflare D1 (SQLite)")]
    end

    subgraph GCP["Google Cloud Functions"]
        Proxy["momo-proxy (固定出口 IP)"]
    end

    subgraph Platforms["外部電商平台 API"]
        MOMO["MOMO 購物網 (MOMO_MAIN)"]
        MO_STORE["MO 店+ (MO_STORE_PLUS)"]
    end

    User <-->|HTTPS| Worker
    Worker <--> D1
    Worker -->|直連 API| MO_STORE
    Worker -->|固定 IP 代理 (Proxy Token)| Proxy
    Proxy -->|MOMO SCM API| MOMO
```

> **💡 為什麼需要 `momo-proxy`？**  
> MOMO SCM API 要求呼叫端必須具備預先註冊的白名單固定 IP，而 Cloudflare Workers 為分散式 Edge 出口，因此透過獨立部署於 Google Cloud Function 的 Proxy（固定出口 IP）轉發 API 請求。

---

## 🛠️ 功能模組說明

| 模組名稱 | 路由路徑 | 主要功能說明 |
| :--- | :--- | :--- |
| **營運總覽** | `/dashboard/overview` | 跨平台總營收、訂單趨勢圖、各平台銷售佔比統計 |
| **商品管理** | `/dashboard/products` | 商品主檔維護、多通路 SKU 對照、庫存與定價檢視 |
| **併單管理** | `/dashboard/merge` | 跨通路訂單自動比對、買家合併辨識、手動/自動併單工作流 |
| **出貨管理** | `/dashboard/shipping` | 待出貨訂單管理、跨平台揀貨單生成、批次出貨標籤列印與狀態回傳 |
| **訂單查詢** | `/dashboard/orders` | 跨平台訂單綜合查詢、訂單狀態追蹤與詳細履歷 |
| **系統設定** | `/dashboard/settings` | 電商平台連線憑證、API 連線狀態與環境參數設定 |

---

## 💻 技術棧

- **前端框架**：Next.js (App Router), React 19, Material UI (MUI v6)
- **運行環境**：Cloudflare Workers (透過 [vinext](https://github.com/cloudflare/vinext) 適配)
- **資料庫與 ORM**：Cloudflare D1 (Serverless SQLite), Drizzle ORM
- **身份驗證**：Better Auth (Google OAuth 2.0 登入保護)
- **外部代理**：Google Cloud Functions (`functions/momo-proxy`)
- **測試工具**：Vitest, React Testing Library (jsdom)

---

## 📁 專案結構

```text
app/
  actions.ts                     登出等全域 Server Actions
  api/auth/[...all]/route.ts      Better Auth 路由處理器
  layout.tsx                      根版型 (Root Layout)
  page.tsx                        登入頁或跳轉邏輯
  login-screen.tsx                登入介面組件
  globals.css, theme.ts           全域樣式與 Material UI 主題
  dashboard/
    layout.tsx                    Dashboard 版型
    page.tsx                      /dashboard 導向至 /dashboard/overview
    (platform-aware)/             平台感知路由群組 (不影響 URL)
      layout.tsx                  權限守門員與 Dashboard 外框
      overview/, orders/, merge/, shipping/, settings/
                                 各功能模組入口
    products/page.tsx             商品管理頁面入口
    *-actions.ts                  各模組 Server Actions
    *-view.tsx                    各模組 View 組件
    dashboard-shell.tsx           Dashboard 外框與佈局
    dashboard-sidebar.tsx         側邊導航欄
    nav-items.ts                  導航項目定義
  hooks/                          前端業務邏輯與 ViewModel Hooks
  lib/
    auth-client.ts                前端 Better Auth 客戶端
    db.ts                         Drizzle D1 實例與綁定存取
    schema.ts                     D1 資料庫結構單一真實來源 (Source of Truth)
    platforms/
      connector.ts               平台 Connector 介面規範
      definitions.ts             前端安全的平台展示定義 (Client-Safe)
      registry.ts                伺服端 Connector 註冊表 (Server-Only)
      config.ts                  平台環境設定讀取
      momo.ts, mo-store-plus.ts  各電商平台 Connector 實作
      *-client.ts                各外部平台 API 客戶端
      *-mapper.ts                API 回應資料轉換器
      product.ts, sales.ts       商品與銷售資料型別合約
      platform-http.ts,
      platform-proxy.ts          共用請求與代理公用程式
  types/                          共用型別定義
  utils/                          純函數工具庫
auth.ts                           Better Auth 配置與 Session 輔助函式
worker/index.ts                   Cloudflare Worker 進入點、D1 橋接與圖片優化
functions/momo-proxy/            獨立部署的 GCP Cloud Function (MOMO 固定出口 IP 代理)
migrations/                       Drizzle Kit 產生的 D1 Migration SQL
public/                           靜態資源
tests/                            Vitest 測試套件
drizzle.config.ts                 Drizzle Kit 配置檔
vite.config.ts                    vinext 與 Cloudflare Vite 插件配置
vitest.config.ts                  Vitest 測試環境配置
wrangler.json                    Cloudflare Worker 部署、綁定與環境設定
```

---

## ⚡ 快速開始 (Quick Start)

### 1. 前置需求
- Node.js `>=22.13.0`
- npm
- Google OAuth Application 憑證 (供登入驗證)
- Cloudflare 帳號 (操作線上 D1 或部署時需要)
- Google Cloud 專案 (僅在需透過 `functions/momo-proxy` 串接 MOMO 時需要)

### 2. 本地開發步驟

1. **安裝依賴**：
   ```bash
   npm install
   ```

2. **建立本地環境變數檔並設定 Google OAuth**：
   ```bash
   # Linux / macOS
   cp .env.example .env
   openssl rand -base64 32
   ```
   ```powershell
   # Windows PowerShell
   Copy-Item .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   - 將產生的密鑰填入 `BETTER_AUTH_SECRET`。
   - 保留 `BETTER_AUTH_URL=http://localhost:3000`。
   - 填入 `AUTH_GOOGLE_ID` 與 `AUTH_GOOGLE_SECRET`。
   - 在 Google Cloud Console 的 OAuth 應用程式中加入 Authorized redirect URI：`http://localhost:3000/api/auth/callback/google`。

3. **執行本地 D1 資料庫遷移**：
   ```bash
   npm run db:migrate:local
   ```

4. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```
   開啟瀏覽器連線至 [http://localhost:3000](http://localhost:3000)。

---

## 🔑 環境變數說明

| 變數名稱 | 必要性 | 說明 |
| :--- | :--- | :--- |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | 必要 | Better Auth 與 Google OAuth 登入設定 |
| `MOMO_PROXY_URL`, `MOMO_PROXY_TOKEN` | 使用固定出口代理時 | 用於將 MOMO 請求導向至 GCP Proxy（需一併設定） |
| `MOMO_SCM_ENTP_ID`, `MOMO_SCM_ENTP_CODE`, `MOMO_SCM_ENTP_PASSWORD`, `MOMO_SCM_OTP_BACK_NO` | 使用 `MOMO_MAIN` 時 | MOMO SCM 廠商後台 API 認證資訊 |
| `MOMO_SCM_THIRD_PARTY_DELIVERY_TYPES`, `MOMO_SCM_THIRD_PARTY_TEMPERATURE_TYPES` | 選填 | 覆寫 MOMO SCM 配送/溫層預設設定 |
| `MO_STORE_PLUS_AUTH_VALUE` | 使用 `MO_STORE_PLUS` 時 | MO 店+ 授權標頭（通常為 `Bearer <JWT>`） |

---

## 📜 常用指令

| 指令 | 說明 |
| :--- | :--- |
| `npm run dev` | 啟動本地開發伺服器 |
| `npm run build` | 建置 Cloudflare Worker 與前端 Bundle |
| `npm run preview` | 透過 Wrangler 在本地預覽 Production Worker (port 3000) |
| `npm test` | 執行 Vitest 測試套件 |
| `npm run test:watch` | 啟動 Vitest 監聽模式 |
| `npm run typecheck` | 執行 TypeScript 型別檢查 |
| `npm run lint` | 執行 ESLint 程式碼檢查 |
| `npm run db:create` | 建立 Cloudflare D1 資料庫 |
| `npm run db:migrate:local` | 執行本地 D1 資料庫遷移 |
| `npm run db:migrate:remote` | 執行線上 D1 資料庫遷移 |
| `npm run db:migrations:list` | 列出線上資料庫已套用的遷移記錄 |
| `npm run db:generate -- --name=<name>` | 根據 `app/lib/schema.ts` 產生 Drizzle 遷移 SQL |

---

## 🗄️ 資料庫變更流程

`app/lib/schema.ts` 為資料庫結構的**唯一真實來源**（包含 Better Auth 表格）。

1. 修改 `app/lib/schema.ts`。
2. 執行產生遷移檔：`npm run db:generate -- --name=<name>`。
3. 檢查 `migrations/` 中產生的 SQL。
4. 先後套用至本地與線上環境：
   ```bash
   npm run db:migrate:local
   npm run db:migrate:remote
   ```
5. 將產生的 SQL 與 `migrations/meta/` 檔案一同提交至 Git。

---

## 🌐 MOMO Proxy 部署說明

`functions/momo-proxy` 為獨立的 Google Cloud Function 工作區：
1. 部署至具備**已向平台登記的固定出口 IP** 之環境。
2. 在 GCP 設定 `MOMO_PROXY_TOKEN` Secret。
3. 取得部署完成的 HTTPS 網址，並填入 Worker 的 `MOMO_PROXY_URL`。

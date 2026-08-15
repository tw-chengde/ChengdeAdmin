import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** 需要 DOM 的測試：元件（`*.test.tsx`）與 hook（`useXxx.test.ts`）。 */
const UI_TESTS = ["tests/**/*.{test,spec}.tsx", "tests/**/use*.{test,spec}.ts"];

/**
 * 測試專用設定，刻意不沿用 vite.config.ts：那份設定會載入 vinext 與 Cloudflare
 * plugin，會把測試跑進 workerd 環境並要求 D1 binding。
 *
 * 依執行環境切成兩個 project：平台 client、mapper、server action、migration 這些
 * 跑在 Workers runtime 的程式碼要用 node 環境測，套 jsdom 會憑空給它們 `window`
 * 與 `document`，誤用瀏覽器 API 的錯誤就要拖到部署後才會出現。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          // Testing Library 的 cleanup 只有這裡需要，掛在全域會讓沒有 DOM 的測試白跑。
          setupFiles: ["./tests/setup.ts"],
          include: UI_TESTS,
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.{test,spec}.{ts,mts,mjs}"],
          exclude: UI_TESTS,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "auth.ts", "worker/**/*.ts", "functions/**/*.ts"],
      exclude: ["app/types/**"],
      reporter: ["text", "json-summary"],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});

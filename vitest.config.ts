import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * 測試專用設定，刻意不沿用 vite.config.ts：那份設定會載入 vinext 與 Cloudflare
 * plugin，會把測試跑進 workerd 環境並要求 D1 binding。這裡只需要 React + jsdom。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx,mts,mjs}"],
  },
});

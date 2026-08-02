import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 每個測試結束後卸載元件，避免上一個測試殘留的 DOM 影響下一個查詢。
afterEach(() => {
  cleanup();
});

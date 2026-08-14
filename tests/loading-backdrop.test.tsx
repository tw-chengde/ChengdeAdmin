import { render, screen } from "@testing-library/react";
import assert from "node:assert/strict";
import { test } from "vitest";
import LoadingBackdrop from "@/app/dashboard/loading-backdrop";

test("LoadingBackdrop 在 open=true 時顯示指定訊息與誠得商標", () => {
  render(<LoadingBackdrop open={true} message="測試讀取中..." />);

  assert.ok(screen.getByText("測試讀取中..."));
  assert.ok(screen.getByAltText("誠得商標"));
});

test("LoadingBackdrop 在 open=true 且未傳 message 時顯示預設提示", () => {
  render(<LoadingBackdrop open={true} />);

  assert.ok(screen.getByText("資料處理中，請稍候..."));
  assert.ok(screen.getByAltText("誠得商標"));
});

test("LoadingBackdrop 在 open=false 時不顯示", () => {
  render(<LoadingBackdrop open={false} message="不應顯示" />);

  assert.equal(screen.queryByText("不應顯示"), null);
  assert.equal(screen.queryByAltText("誠得商標"), null);
});

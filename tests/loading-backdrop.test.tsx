import { render, screen } from "@testing-library/react";
import assert from "node:assert/strict";
import { test } from "vitest";
import LoadingBackdrop from "@/app/dashboard/loading-backdrop";

test.each([
  { given: "指定訊息", props: { message: "測試讀取中..." }, text: "測試讀取中..." },
  { given: "未傳 message", props: {}, text: "資料處理中，請稍候..." },
])("LoadingBackdrop 在 open=true 且$given時顯示對應提示與誠得商標", ({ props, text }) => {
  render(<LoadingBackdrop open={true} {...props} />);

  assert.ok(screen.getByText(text));
  assert.ok(screen.getByAltText("誠得商標"));
});

test("LoadingBackdrop 在 open=false 時不顯示", () => {
  render(<LoadingBackdrop open={false} message="不應顯示" />);

  assert.equal(screen.queryByText("不應顯示"), null);
  assert.equal(screen.queryByAltText("誠得商標"), null);
});

import assert from "node:assert/strict";
import { test } from "vitest";
import { base64ToBlob } from "@/app/utils/downloads";

test("base64ToBlob 還原出正確的位元組與 content type", async () => {
  // "hello" 的 base64 編碼。
  const blob = base64ToBlob("aGVsbG8=", "application/pdf");

  assert.equal(blob.type, "application/pdf");
  assert.equal(blob.size, 5);
  const text = await blob.text();
  assert.equal(text, "hello");
});

test("base64ToBlob 處理空字串", async () => {
  const blob = base64ToBlob("", "application/pdf");
  assert.equal(blob.size, 0);
});

test("base64ToBlob accepts a PDF data URI", async () => {
  const blob = base64ToBlob("data:application/pdf;base64,aGVsbG8=", "application/pdf");

  assert.equal(await blob.text(), "hello");
});

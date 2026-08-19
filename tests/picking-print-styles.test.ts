import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("picking-sheet print layout releases dialog scrolling and keeps the table in document flow", () => {
  assert.match(css, /\.MuiDialog-paper\s*\{[\s\S]*?max-height:\s*none !important;[\s\S]*?overflow:\s*visible !important;/);
  assert.match(css, /\.print-area\s*\{[\s\S]*?position:\s*static !important;[\s\S]*?overflow:\s*visible !important;/);
  assert.match(css, /size:\s*A4\s+portrait;/);
});

test("picking-sheet print layout hides background document tree and backdrop to prevent trailing blank pages", () => {
  assert.match(css, /body\s*>\s*\*:not\(\.MuiDialog-root\):not\(\.print-area\)\s*\{[\s\S]*?display:\s*none !important;/);
  assert.match(css, /\.MuiBackdrop-root\s*\{[\s\S]*?display:\s*none !important;/);
  assert.match(css, /\.print-area\s+tr\s*\{[\s\S]*?break-inside:\s*avoid;/);
});


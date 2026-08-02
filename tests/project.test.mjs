import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "vitest";

// jsdom 環境下 import.meta.url 不是 file:// URL，改以專案根目錄解析路徑。
const fromRoot = (path) => resolve(process.cwd(), path);
const read = (path) => readFile(fromRoot(path), "utf8");

test("includes Google authentication and a protected dashboard", async () => {
  const [auth, dashboard, home, login] = await Promise.all([
    read("auth.ts"),
    read("app/dashboard/page.tsx"),
    read("app/page.tsx"),
    read("app/login-screen.tsx"),
  ]);

  assert.match(auth, /next-auth\/providers\/google/);
  assert.match(dashboard, /await auth\(\)/);
  assert.match(dashboard, /redirect\("\/"\)/);
  assert.match(home, /await auth\(\)/);
  assert.match(home, /redirect\("\/dashboard"\)/);
  assert.match(login, /使用 Google(?: 帳號)?登入/);
});

test("marks the internal dashboard as private", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /誠得後台管理系統/);
  assert.match(layout, /index: false/);
  assert.match(layout, /follow: false/);
  assert.doesNotMatch(layout, /openGraph|twitter|og\.png/);
});

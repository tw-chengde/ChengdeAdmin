import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("includes Google authentication and a protected dashboard", async () => {
  const [auth, dashboard, home, login] = await Promise.all([
    readFile(new URL("../auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login-screen.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(auth, /next-auth\/providers\/google/);
  assert.match(dashboard, /await auth\(\)/);
  assert.match(dashboard, /redirect\("\/"\)/);
  assert.match(home, /await auth\(\)/);
  assert.match(home, /redirect\("\/dashboard"\)/);
  assert.match(login, /使用 Google(?: 帳號)?登入/);
});

test("marks the internal dashboard as private", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /誠得後台管理系統/);
  assert.match(layout, /index: false/);
  assert.match(layout, /follow: false/);
  assert.doesNotMatch(layout, /openGraph|twitter|og\.png/);
});

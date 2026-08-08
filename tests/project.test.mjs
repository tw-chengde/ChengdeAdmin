import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "vitest";

// jsdom 環境下 import.meta.url 不是 file:// URL，改以專案根目錄解析路徑。
const fromRoot = (path) => resolve(process.cwd(), path);
const read = (path) => readFile(fromRoot(path), "utf8");

// 遞迴走訪 app/dashboard，還原每個 page.tsx 實際對應的路由（route group 資料夾不計入網址）。
async function collectDashboardRoutes() {
  const routes = [];
  async function walk(dir, segments) {
    const entries = await readdir(fromRoot(dir), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const isRouteGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
        await walk(`${dir}/${entry.name}`, isRouteGroup ? segments : [...segments, entry.name]);
      } else if (entry.name === "page.tsx") {
        routes.push(`/dashboard${segments.length ? "/" + segments.join("/") : ""}`);
      }
    }
  }
  await walk("app/dashboard", []);
  return routes;
}

test("includes Google authentication and a protected dashboard", async () => {
  const [auth, dashboardLayout, dashboardPage, home, login] = await Promise.all([
    read("auth.ts"),
    read("app/dashboard/layout.tsx"),
    read("app/dashboard/page.tsx"),
    read("app/page.tsx"),
    read("app/login-screen.tsx"),
  ]);

  assert.match(auth, /betterAuth\(/);
  assert.match(auth, /socialProviders/);
  assert.match(auth, /google:\s*\{/);
  assert.match(dashboardLayout, /getSession\(\)/);
  assert.match(dashboardLayout, /redirect\("\/"\)/);
  assert.match(dashboardPage, /redirect\("\/dashboard\/orders"\)/);
  assert.match(home, /getSession\(\)/);
  assert.match(home, /redirect\("\/dashboard"\)/);
  assert.match(login, /使用 Google(?: 帳號)?登入/);
});

// 這兩項少了任何一個，登入/登出都會在 Cloudflare Workers 上安靜地壞掉：
// 沒有 database 會落到記憶體 adapter，沒有 nextCookies 則 server action 清不掉 cookie。
test("persists auth state in D1 and forwards cookies from server actions", async () => {
  const auth = await read("auth.ts");

  assert.match(auth, /database:\s*getD1Database\(\)/);
  assert.match(auth, /nextCookies\(\)/);
});

test("every sidebar nav item points to an existing dashboard route", async () => {
  const navItemsSource = await read("app/dashboard/nav-items.ts");
  const hrefs = [...navItemsSource.matchAll(/href:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length > 0, "nav-items.ts 應該至少有一個導覽項目");

  const routes = await collectDashboardRoutes();
  for (const href of hrefs) {
    assert.ok(routes.includes(href), `nav-items.ts 裡的 ${href} 沒有對應的 page.tsx`);
  }
});

test("marks the internal dashboard as private", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /誠得後台管理系統/);
  assert.match(layout, /index: false/);
  assert.match(layout, /follow: false/);
  assert.doesNotMatch(layout, /openGraph|twitter|og\.png/);
});

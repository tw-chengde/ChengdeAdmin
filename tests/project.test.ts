import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { test } from "vitest";

// jsdom 環境下 import.meta.url 不是 file:// URL，改以專案根目錄解析路徑。
const fromRoot = (path: string) => resolve(process.cwd(), path);
const read = (path: string) => readFile(fromRoot(path), "utf8");

/** 專案內所有的 .ts / .tsx，以專案根目錄為基準的相對路徑（一律使用 /）。 */
async function collectSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(fromRoot(dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(path)));
    else if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

/** 把 import 說明字串解析成專案內的檔案路徑；解析不到（第三方套件）回傳 null。 */
async function resolveImport(specifier: string, importerPath: string): Promise<string | null> {
  let base;
  if (specifier.startsWith("@/")) base = specifier.slice(2);
  else if (specifier.startsWith(".")) base = relative(process.cwd(), resolve(dirname(fromRoot(importerPath)), specifier)).split("\\").join("/");
  else return null;

  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    try {
      if ((await stat(fromRoot(candidate))).isFile()) return candidate;
    } catch {
      // 換下一個副檔名組合。
    }
  }
  return null;
}

/** 去掉註解，避免拿註解裡提到的字串當成真正的程式碼比對。 */
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/**
 * 從 entry 出發，沿專案內部的 import 走訪可達的所有模組。
 *
 * 走到 "use server" 模組就停住不再往下：那是 bundler 的邊界，client 端拿到的是 RPC stub，
 * server action 內部 import 了什麼並不會進到 client bundle。
 */
async function collectModuleGraph(entry: string): Promise<Set<string>> {
  const seen = new Set<string>();
  const queue: string[] = [entry];
  while (queue.length) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);

    const source = await read(current);
    if (current !== entry && /^\s*["']use server["']/.test(source)) continue;

    const specifiers = [...stripComments(source).matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map((match) => match[1]!);
    for (const specifier of specifiers) {
      const resolved = await resolveImport(specifier, current);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

// 遞迴走訪 app/dashboard，還原每個 page.tsx 實際對應的路由（route group 資料夾不計入網址）。
async function collectDashboardRoutes(): Promise<string[]> {
  const routes: string[] = [];
  async function walk(dir: string, segments: string[]) {
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

// Better Auth 的設定（socialProviders／database／nextCookies）與各頁的 redirect 行為，
// 分別由 auth.test.ts 與 routes.test.tsx 以實際執行的方式驗證，這裡不再重複掃原始碼。
// 登入畫面的入口文字沒有其他測試涵蓋，留在這裡。
test("the login screen offers Google sign-in", async () => {
  assert.match(await read("app/login-screen.tsx"), /使用 Google(?: 帳號)?登入/);
});

test("every sidebar nav item points to an existing dashboard route", async () => {
  const navItemsSource = await read("app/dashboard/nav-items.ts");
  const hrefs = [...navItemsSource.matchAll(/href:\s*"([^"]+)"/g)].map((match) => match[1]!);
  assert.ok(hrefs.length > 0, "nav-items.ts 應該至少有一個導覽項目");

  const routes = await collectDashboardRoutes();
  for (const href of hrefs) {
    assert.ok(routes.includes(href), `nav-items.ts 裡的 ${href} 沒有對應的 page.tsx`);
  }
});

// definitions.ts（顯示用的純資料）與 registry.ts（connector，會拉進平台 API client 與憑證讀取）
// 是刻意分開的。client component 只需要前者；一旦有人為了圖方便從 registry 匯入，
// 整包 SCM / mo店+ client 就會被打包進 client bundle，而且 momo-scm-client.ts
// 上「Credentials are never imported by client modules」那句註解會再次變成謊話。
test("client components never reach the server-only platform connectors", async () => {
  const clientEntries: string[] = [];
  for (const file of await collectSourceFiles("app")) {
    if (/^\s*["']use client["']/.test(await read(file))) clientEntries.push(file);
  }
  assert.ok(clientEntries.length > 0, "應該至少有一個 \"use client\" 模組");

  const serverOnly = "app/lib/platforms/registry.ts";
  for (const entry of clientEntries) {
    const graph = await collectModuleGraph(entry);
    assert.ok(
      !graph.has(serverOnly),
      `${entry} 透過 import 連到了 ${serverOnly}；平台顯示資料請改用 app/lib/platforms/definitions.ts`,
    );
  }
});

// 反過來確認 definitions.ts 真的維持「純資料」——不得碰到任何平台 client 或環境變數。
test("platform definitions stay free of clients and environment access", async () => {
  const graph = await collectModuleGraph("app/lib/platforms/definitions.ts");
  for (const file of graph) {
    assert.doesNotMatch(file, /-client\.ts$/, `definitions.ts 不應連到平台 client：${file}`);
    assert.doesNotMatch(
      stripComments(await read(file)),
      /process\.env/,
      `definitions.ts 不應連到讀取環境變數的模組：${file}`,
    );
  }
});

test("marks the internal dashboard as private", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /誠得後台管理系統/);
  assert.match(layout, /index: false/);
  assert.match(layout, /follow: false/);
  assert.doesNotMatch(layout, /openGraph|twitter|og\.png/);
});

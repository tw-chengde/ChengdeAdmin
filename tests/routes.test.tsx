import assert from "node:assert/strict";
import { test, vi } from "vitest";

const getSession = vi.fn();
const redirect = vi.fn((path: string) => { throw new Error(`redirect:${path}`); });
const DashboardShell = vi.fn();
const OverviewView = vi.fn();
const OrdersView = vi.fn();
const MergeBindingsView = vi.fn();
const PlatformsView = vi.fn();
const ProductsView = vi.fn();

vi.mock("@/auth", () => ({ getSession: () => getSession() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("@/app/dashboard/dashboard-shell", () => ({ default: DashboardShell }));
vi.mock("@/app/dashboard/overview-view", () => ({ default: OverviewView }));
vi.mock("@/app/dashboard/orders-view", () => ({ default: OrdersView }));
vi.mock("@/app/dashboard/merge-bindings-view", () => ({ default: MergeBindingsView }));
vi.mock("@/app/dashboard/platforms-view", () => ({ default: PlatformsView }));
vi.mock("@/app/dashboard/products-view", () => ({ default: ProductsView }));

const { default: RootLayout } = await import("@/app/layout");
const { default: Home } = await import("@/app/page");
const { default: DashboardLayout } = await import("@/app/dashboard/layout");
const { default: DashboardPage } = await import("@/app/dashboard/page");
const { default: PlatformAwareLayout } = await import("@/app/dashboard/(platform-aware)/layout");
const { default: OverviewPage } = await import("@/app/dashboard/(platform-aware)/overview/page");
const { default: OrdersPage } = await import("@/app/dashboard/(platform-aware)/orders/page");
const { default: MergePage } = await import("@/app/dashboard/(platform-aware)/merge/page");
const { default: SettingsPage } = await import("@/app/dashboard/(platform-aware)/settings/page");
const { default: ProductsPage } = await import("@/app/dashboard/products/page");

test("RootLayout keeps dashboard pages private from search engines", () => {
  const element = RootLayout({ children: "content" });
  assert.equal(element.type, "html");
  assert.equal(element.props.lang, "zh-Hant");
});

test("Home redirects authenticated users and renders the login screen otherwise", async () => {
  getSession.mockResolvedValueOnce({ user: { id: "user-1" } });
  await assert.rejects(() => Home(), /redirect:\/dashboard/);

  getSession.mockResolvedValueOnce(null);
  const element = await Home();
  assert.ok(element);
});

test("DashboardLayout rejects guests and passes the session profile to its shell", async () => {
  getSession.mockResolvedValueOnce(null);
  await assert.rejects(() => DashboardLayout({ children: "content" }), /redirect:\//);

  getSession.mockResolvedValueOnce({ user: { name: null, email: null, image: null } });
  const element = await DashboardLayout({ children: "content" });
  assert.equal(element.type, DashboardShell);
  assert.deepEqual(element.props.user, { name: "使用者", email: "", image: undefined });
  assert.equal(element.props.children, "content");
});

test("Dashboard routes mount their matching view and dashboard index redirects to overview", () => {
  assert.throws(() => DashboardPage(), /redirect:\/dashboard\/overview/);
  assert.equal(OverviewPage().type, OverviewView);
  assert.equal(OrdersPage().type, OrdersView);
  assert.equal(MergePage().type, MergeBindingsView);
  assert.equal(SettingsPage().type, PlatformsView);
  assert.equal(ProductsPage().type, ProductsView);
});

test("PlatformAwareLayout wraps child routes in the platform settings provider", () => {
  const element = PlatformAwareLayout({ children: "content" });
  assert.equal(element.props.children, "content");
});
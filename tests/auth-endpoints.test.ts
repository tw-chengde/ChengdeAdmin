import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const signOut = vi.fn();
const getHeaders = vi.fn();
const redirect = vi.fn();
const handler = vi.fn();

vi.mock("@/auth", () => ({
  getAuth: () => ({ api: { signOut } }),
}));
vi.mock("next/headers", () => ({ headers: () => getHeaders() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

beforeEach(() => {
  vi.clearAllMocks();
  getHeaders.mockResolvedValue(new Headers({ cookie: "session=abc" }));
});

test("signOutFromDashboard forwards request headers and returns to the login page", async () => {
  const { signOutFromDashboard } = await import("@/app/actions");

  await signOutFromDashboard();

  assert.deepEqual(signOut.mock.calls[0][0], { headers: await getHeaders.mock.results[0]?.value });
  assert.deepEqual(redirect.mock.calls, [["/"]]);
});

test("the Better Auth route exposes one handler for GET and POST", async () => {
  vi.doMock("@/auth", () => ({ getAuth: () => ({ handler }) }));
  vi.resetModules();
  const route = await import("@/app/api/auth/[...all]/route");

  assert.equal(route.GET, route.POST);
  assert.equal(typeof route.GET, "function");
});